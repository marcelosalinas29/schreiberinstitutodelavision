import type { DictadoParseado, ImportacionParseada } from "@/types/domain";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.5-flash";

const CAMPOS_HC = `
motivo_consulta, antecedentes_personales, antecedentes_familiares, antecedentes_oftalmologicos,
arm_od, arm_oi, refraccion_od, refraccion_oi,
av_sc_od, av_sc_oi, av_cc_od, av_cc_oi,
bmc_od, bmc_oi, pio_od (número mmHg), pio_oi (número mmHg), pio_hora,
fo_od, fo_oi, diagnostico, cie10, tratamiento, proxima_cita
`.trim();

const HC_SCHEMA = {
  type: "object",
  properties: {
    motivo_consulta: { type: "string" },
    antecedentes_personales: { type: "string" },
    antecedentes_familiares: { type: "string" },
    antecedentes_oftalmologicos: { type: "string" },
    arm_od: { type: "string" },
    arm_oi: { type: "string" },
    refraccion_od: { type: "string" },
    refraccion_oi: { type: "string" },
    av_sc_od: { type: "string" },
    av_sc_oi: { type: "string" },
    av_cc_od: { type: "string" },
    av_cc_oi: { type: "string" },
    bmc_od: { type: "string" },
    bmc_oi: { type: "string" },
    pio_od: { type: ["number", "null"] },
    pio_oi: { type: ["number", "null"] },
    pio_hora: { type: "string" },
    fo_od: { type: "string" },
    fo_oi: { type: "string" },
    diagnostico: { type: "string" },
    cie10: { type: "string" },
    tratamiento: { type: "string" },
    proxima_cita: { type: "string" },
  },
  additionalProperties: false,
} as const;

interface GatewayMessageContent {
  type: string;
  text?: string;
  image_url?: { url: string };
  file?: { filename: string; file_data: string };
}

async function callGateway(
  messages: { role: string; content: string | GatewayMessageContent[] }[],
  tool: { name: string; description: string; parameters: unknown },
): Promise<Record<string, unknown>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("El servicio de IA no está disponible en este momento.");

  const response = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });

  if (response.status === 429) throw new Error("Límite de uso de IA alcanzado. Intentá de nuevo en unos minutos.");
  if (response.status === 402) throw new Error("Se agotaron los créditos de IA del espacio de trabajo.");
  if (!response.ok) {
    const detail = await response.text();
    console.error("AI gateway error", response.status, detail);
    throw new Error("No se pudo procesar el pedido con IA.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
  };
  const args = payload.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("La IA no devolvió un resultado utilizable.");
  return JSON.parse(args) as Record<string, unknown>;
}

export async function parseDictadoOftalmologico(transcripcion: string): Promise<DictadoParseado> {
  const result = await callGateway(
    [
      {
        role: "system",
        content: `Sos un asistente clínico oftalmológico argentino. Recibís el dictado por voz, desordenado y coloquial, de un médico oftalmólogo durante la consulta.
Tu tarea es distribuir la información en los campos estructurados de la historia clínica: ${CAMPOS_HC}.
Reglas:
- OD = ojo derecho, OI = ojo izquierdo. Interpretá "derecho/izquierdo" y abreviaturas habituales (AV, BMC, PIO, FO, ARM, MC, AP, AF, AO).
- Respetá la terminología dictada: no inventes hallazgos ni diagnósticos que el médico no mencionó.
- Dejá vacío ("") cualquier campo del que no haya información.
- pio_od y pio_oi deben ser números en mmHg o null.
- cie10 solo si el diagnóstico dictado se corresponde claramente con un código CIE-10; si no, dejalo vacío.
- Corregí ortografía y expandí abreviaturas de dictado a texto clínico claro y conciso, en español.`,
      },
      { role: "user", content: transcripcion },
    ],
    {
      name: "completar_historia_clinica",
      description: "Distribuye el dictado desordenado en los campos de la historia clínica oftalmológica.",
      parameters: HC_SCHEMA,
    },
  );
  return result as DictadoParseado;
}

export async function parseDocumentoClinico(input: {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}): Promise<ImportacionParseada> {
  const esImagen = input.mimeType.startsWith("image/");
  const contenido: GatewayMessageContent[] = [
    {
      type: "text",
      text: "Extraé los datos filiatorios del paciente y el contenido clínico oftalmológico de esta ficha médica antigua (puede estar manuscrita o escaneada).",
    },
    esImagen
      ? { type: "image_url", image_url: { url: input.dataUrl } }
      : { type: "file", file: { filename: input.fileName, file_data: input.dataUrl } },
  ];

  const result = await callGateway(
    [
      {
        role: "system",
        content: `Sos un asistente de digitalización de historias clínicas oftalmológicas en Argentina.
Transcribí y estructurá lo que ves. No inventes datos: si un dato no aparece, dejalo vacío.
Fechas en formato AAAA-MM-DD. Devolvé también un resumen breve en español de lo hallado.`,
      },
      { role: "user", content: contenido },
    ],
    {
      name: "importar_ficha_medica",
      description: "Extrae datos filiatorios y clínicos de una ficha médica escaneada.",
      parameters: {
        type: "object",
        properties: {
          paciente: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              apellido: { type: "string" },
              dni: { type: "string" },
              fecha_nacimiento: { type: "string" },
              telefono: { type: "string" },
              email: { type: "string" },
              direccion: { type: "string" },
              obra_social: { type: "string" },
              nro_afiliado: { type: "string" },
            },
            additionalProperties: false,
          },
          historia: {
            type: "object",
            properties: { ...HC_SCHEMA.properties, fecha: { type: "string" } },
            additionalProperties: false,
          },
          resumen: { type: "string" },
        },
        required: ["paciente", "historia", "resumen"],
        additionalProperties: false,
      },
    },
  );

  return result as unknown as ImportacionParseada;
}
