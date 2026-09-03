import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Save, Sparkles, Square, FileDown, ClipboardList, FileSignature, Printer, Glasses, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORIA_VACIA, HistoriaForm, type HistoriaDraft } from "@/features/historias/HistoriaForm";
import { useCurrentUser } from "@/features/auth/useAuth";
import { calcularEdad } from "@/features/patients/PatientForm";
import { parseDictado } from "@/lib/ai.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { recetaSoloMedicamentos } from "@/lib/utils";
import { generarRecetaPDF } from "@/lib/pdf";
import { datosMedicoReceta } from "@/services/perfil";
import { createHistoria, deleteHistoria, getHistoria, listHistoriasPaciente, updateHistoria } from "@/services/historias";
import { listPacientes } from "@/services/pacientes";
import { listPlantillas } from "@/services/plantillas";
import { listFormatosHistoria } from "@/services/formatosHistoria";
import { usePedidoPracticas } from "@/features/practicas/usePedidoPracticas";
import { TIPOS_DOCUMENTO, completarDocumento, listDocumentos } from "@/services/documentosClinicos";
import type { DocumentoTipo } from "@/types/domain";

/** Textos usados por los botones directos de ECG y Laboratorio prequirúrgico. */
const TEXTOS_PREQUIRURGICOS: Record<string, string> = {
  "Prequirúrgico - ECG":
    "Solicito Electrocardiograma y valoración de riesgo prequirúrgico. DIAG: prequirúrgico cirugía de cataratas.",
  "Prequirúrgico - Laboratorio":
    "Solicito laboratorio prequirúrgico: Hemograma completo, Glucemia, Coagulograma, VSG, Orina completa, HIV y VDRL.",
  "Complementarios Vasculitis/Uveítis":
    "Solicito: Hemograma completo, Glucemia, VSG, PCR, Coagulograma, HIV, VDRL, Toxoplasmosis IgM e IgG, FAN, FR, C3 y C4 (complemento), HLA B27, IgE Total, ECA, ANCA C y P, Anticardiolipina IgG e IgM, Anticoagulante lúpico, B2 Glicoproteína, TSH, T4 libre, aTPO, TRABs II, Antitiroglobulina.",
};

export const Route = createFileRoute("/_authenticated/consulta")({
  validateSearch: (search: Record<string, unknown>): { paciente?: string | undefined; historia?: string | undefined } => ({
    paciente: typeof search["paciente"] === "string" ? search["paciente"] : undefined,
    historia: typeof search["historia"] === "string" ? search["historia"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Consulta y dictado — Schreiber Instituto de la Visión" },
      { name: "description", content: "Cargá la historia clínica oftalmológica dictando libremente: la IA ordena cada dato en su campo." },
      { property: "og:title", content: "Consulta y dictado — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Historia clínica estructurada con dictado inteligente y receta en PDF." },
    ],
  }),
  component: Consulta,
});

/** Reconocimiento de voz del navegador; si no existe, se puede escribir el dictado. */
function useDictado(onTexto: (texto: string) => void) {
  const [grabando, setGrabando] = useState(false);
  const recognitionRef = useRef<any>(null);

  const alternar = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Tu navegador no soporta dictado por voz. Escribí o pegá el texto.");
      return;
    }
    if (grabando) {
      recognitionRef.current?.stop();
      setGrabando(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let texto = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) texto += `${event.results[i][0].transcript} `;
      onTexto(texto);
    };
    recognition.onerror = () => setGrabando(false);
    recognition.onend = () => setGrabando(false);
    recognition.start();
    recognitionRef.current = recognition;
    setGrabando(true);
  };

  return { grabando, alternar };
}

function Consulta() {
  const qc = useQueryClient();
  const { paciente: pacienteDeUrl, historia: historiaEnUrl } = Route.useSearch();
  const navigate = useNavigate();
  // Consulta existente que se está viendo/editando (viene de la URL o se elige en la lista).
  const [historiaDeUrl, setHistoriaDeUrl] = useState<string | undefined>(historiaEnUrl);
  const [pacienteId, setPacienteId] = useState(pacienteDeUrl ?? "");
  const [historiaId, setHistoriaId] = useState<string | undefined>(historiaEnUrl);
  const [autoEstado, setAutoEstado] = useState<"idle" | "guardando" | "guardado">("idle");
  const [transcripcion, setTranscripcion] = useState("");
  const [draft, setDraft] = useState<HistoriaDraft>(HISTORIA_VACIA);
  const [docsAbierto, setDocsAbierto] = useState(false);
  const [docElegido, setDocElegido] = useState("");
  const [docManual, setDocManual] = useState(false);
  const [manualTitulo, setManualTitulo] = useState("");
  const [manualContenido, setManualContenido] = useState("");

  const { isMedico } = useCurrentUser();
  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
  const documentos = useQuery({ queryKey: ["documentos-clinicos"], queryFn: listDocumentos });
  const formatosHistoria = useQuery({ queryKey: ["formatos-historia"], queryFn: listFormatosHistoria });
  const paciente = (pacientes.data ?? []).find((p) => p.id === pacienteId) ?? null;

  // Edición de una consulta existente (?historia=<id>)
  const historiaExistente = useQuery({
    queryKey: ["historia", historiaDeUrl],
    enabled: Boolean(historiaDeUrl),
    queryFn: () => getHistoria(historiaDeUrl!),
  });

  useEffect(() => {
    const h = historiaExistente.data;
    if (!h) return;
    const { id: _id, paciente_id, created_at: _createdAt, ...campos } = h as Record<string, unknown> & {
      id: string;
      paciente_id: string;
      created_at?: string;
    };
    setDraft(campos as unknown as HistoriaDraft);
    if (paciente_id) setPacienteId(paciente_id);
    setTranscripcion((h.dictado_crudo as string | null) ?? "");
  }, [historiaExistente.data]);

  // Una sola historia por paciente por día: si ya existe una de HOY, se retoma.
  // Si no existe, NO se crea nada solo: la médica toca "Nueva consulta".
  const creandoRef = useRef(false);

  // Si se cambia de paciente en una consulta nueva, se limpia el estado.
  const pacienteAnterior = useRef(pacienteId);
  useEffect(() => {
    if (historiaDeUrl) return;
    if (pacienteAnterior.current !== pacienteId) {
      pacienteAnterior.current = pacienteId;
      setHistoriaId(undefined);
      setDraft(HISTORIA_VACIA);
      setTranscripcion("");
      setAutoEstado("idle");
    }
  }, [pacienteId, historiaDeUrl]);

  // Autoguardado con debounce de 1 minuto (no en cada tecla).
  const primerRender = useRef(true);
  useEffect(() => {
    if (!historiaId || !isMedico) return;
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    setAutoEstado("guardando");
    const t = setTimeout(() => {
      void updateHistoria(historiaId, { ...draft, dictado_crudo: transcripcion || null })
        .then(() => setAutoEstado("guardado"))
        .catch(() => setAutoEstado("idle"));
    }, 60000);
    return () => clearTimeout(t);
  }, [draft, transcripcion, historiaId, isMedico]);

  const { grabando, alternar } = useDictado((texto) => setTranscripcion((prev) => `${prev} ${texto}`.trim()));

  const parse = useServerFn(parseDictado);
  const ordenar = useMutation({
    mutationFn: () => parse({ data: { transcripcion } }),
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, ...data, fecha: prev.fecha ?? hoyISO() }));
      toast.success("Dictado ordenado en los campos clínicos");
    },
    onError: () => toast.error("No se pudo procesar el dictado"),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!pacienteId) throw new Error("Elegí un paciente");
      if (historiaId) {
        await updateHistoria(historiaId, { ...draft, dictado_crudo: transcripcion || null });
        return;
      }
      const creada = await createHistoria({ ...draft, paciente_id: pacienteId, dictado_crudo: transcripcion || null });
      setHistoriaId(creada.id);
    },
    onSuccess: () => {
      toast.success(historiaDeUrl ? "Consulta actualizada" : "Historia clínica guardada");
      setAutoEstado("guardado");
      void qc.invalidateQueries({ queryKey: ["historias"] });
      void qc.invalidateQueries({ queryKey: ["historias-paciente"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar"),
  });

  // Descartar una consulta nueva creada por error: borra la historia y deja la pantalla limpia.
  const descartar = useMutation({
    mutationFn: async () => {
      if (!historiaId) throw new Error("No hay consulta para descartar");
      await deleteHistoria(historiaId);
    },
    onSuccess: () => {
      setHistoriaId(undefined);
      setDraft(HISTORIA_VACIA);
      setTranscripcion("");
      setAutoEstado("idle");
      setPacienteId("");
      pacienteAnterior.current = "";
      toast.success("Consulta descartada");
      void qc.invalidateQueries({ queryKey: ["historias"] });
      void qc.invalidateQueries({ queryKey: ["historias-paciente"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo descartar"),
  });

  const confirmarDescarte = () => {
    if (!window.confirm("¿Descartar esta consulta? Se borra de la base y no se puede recuperar.")) return;
    descartar.mutate();
  };

  // Consultas anteriores del paciente elegido (para cambiar de consulta sin salir de la pantalla).
  const historiasPaciente = useQuery({
    queryKey: ["historias-paciente", pacienteId],
    enabled: Boolean(pacienteId),
    queryFn: () => listHistoriasPaciente(pacienteId),
  });

  /** Abre una consulta anterior en esta misma pantalla (sin sumar entradas al historial del navegador). */
  const abrirConsulta = (id: string) => {
    if (id === historiaDeUrl) return;
    setHistoriaDeUrl(id);
    setHistoriaId(id);
    setAutoEstado("idle");
    primerRender.current = true;
    void navigate({ to: "/consulta", search: { paciente: pacienteId || undefined, historia: id }, replace: true });
  };

  const hoy = hoyISO();

  /** Carga en el formulario una historia ya existente (sin crear nada). */
  const cargarEnDraft = (h: Record<string, unknown> & { id: string; paciente_id: string }) => {
    const { id: _id, paciente_id: _pid, created_at: _c, ...campos } = h;
    setDraft(campos as unknown as HistoriaDraft);
    setTranscripcion(((h as { dictado_crudo?: string | null }).dictado_crudo ?? "") as string);
  };

  // Si el paciente elegido ya tiene una consulta de HOY, se retoma automáticamente.
  useEffect(() => {
    if (historiaDeUrl || historiaId || !pacienteId) return;
    const lista = historiasPaciente.data;
    if (!lista) return;
    const deHoy = lista.find((h) => h.fecha === hoy);
    if (!deHoy) return;
    setHistoriaId(deHoy.id);
    primerRender.current = true;
    cargarEnDraft(deHoy as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historiasPaciente.data, pacienteId, historiaId, historiaDeUrl, hoy]);

  const hayConsultaDeHoy = Boolean(historiaId) || (historiasPaciente.data ?? []).some((h) => h.fecha === hoy);

  /** Crea explícitamente la consulta de hoy (único punto donde se crea una historia nueva). */
  const nuevaConsulta = () => {
    if (!pacienteId) {
      toast.error("Elegí un paciente");
      return;
    }
    if (creandoRef.current) return;
    const existente = (historiasPaciente.data ?? []).find((h) => h.fecha === hoy);
    if (existente) {
      setHistoriaDeUrl(undefined);
      setHistoriaId(existente.id);
      primerRender.current = true;
      cargarEnDraft(existente as never);
      toast.info("Ya había una consulta de hoy: se retomó esa");
      return;
    }
    creandoRef.current = true;
    setHistoriaDeUrl(undefined);
    setDraft({ ...HISTORIA_VACIA, fecha: hoy });
    setTranscripcion("");
    setAutoEstado("idle");
    primerRender.current = true;
    void createHistoria({ paciente_id: pacienteId, fecha: hoy, dictado_crudo: null })
      .then((h) => {
        setHistoriaId(h.id);
        void qc.invalidateQueries({ queryKey: ["historias-paciente"] });
        void navigate({ to: "/consulta", search: { paciente: pacienteId, historia: undefined }, replace: true });
      })
      .catch(() => toast.error("No se pudo iniciar la consulta"))
      .finally(() => {
        creandoRef.current = false;
      });
  };



  const receta = (soloMedicamentos = false) => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    void (async () => {
      const medico = await datosMedicoReceta();
      const dx = (draft.diagnostico ?? "").trim();
      const tto = (draft.tratamiento ?? "").trim();
      const cuerpo = tto ? `Colirio oftálmico:\n${tto}` : dx;
      const base = [dx ? `Diagnóstico: ${dx}` : "", cuerpo].filter(Boolean).join("\n\n");
      await generarRecetaPDF({
        paciente,
        contenido: soloMedicamentos ? recetaSoloMedicamentos(base) : base,
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        formato: "a5",
      }, { modo: "imprimir" });
    })();
  };

  /** Pedido rápido en A5 reutilizando el texto guardado en formatos_historia. */
  const pedidoDesdeFormato = (nombreFormato: string, titulo: string) => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    const formato = formatosHistoria.data?.find((f) => f.nombre === nombreFormato);
    const contenido = formato?.contenido ?? TEXTOS_PREQUIRURGICOS[nombreFormato] ?? "";
    if (!contenido) {
      toast.error(`No se encontró el formato "${nombreFormato}"`);
      return;
    }
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        formato: "a5",
        titulo,
      }, { modo: "imprimir" });
    })();
  };

  const pedidoEcg = () => pedidoDesdeFormato("Prequirúrgico - ECG", "ECG");
  const pedidoLaboratorioPrequirurgico = () =>
    pedidoDesdeFormato("Prequirúrgico - Laboratorio", "Laboratorio prequirúrgico");
  const pedidoVasculitisUveitis = () =>
    pedidoDesdeFormato("Complementarios Vasculitis/Uveítis", "Vasculitis/Uveítis");

  /** Receta óptica: graduación de lejos y de cerca por ojo, en A5. */
  const recetaOptica = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    const lejosOd = (draft.refraccion_od ?? "").trim();
    const lejosOi = (draft.refraccion_oi ?? "").trim();
    const cercaOd = (draft.refraccion_cerca_od ?? "").trim();
    const cercaOi = (draft.refraccion_cerca_oi ?? "").trim();
    if (!lejosOd && !lejosOi && !cercaOd && !cercaOi) {
      toast.error("Cargá la refracción de lejos o de cerca antes de generar la receta óptica");
      return;
    }
    const vacio = "Esf: ___ Cil: ___ Eje: ___";
    const contenido = [
      "Lejos",
      `O.D. ${lejosOd || vacio}`,
      `O.I. ${lejosOi || vacio}`,
      "",
      "Cerca",
      `O.D. ${cercaOd || vacio}`,
      `O.I. ${cercaOi || vacio}`,
      "",
      "Diagnóstico: Ametropía",
    ].join("\n");
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: "Receta óptica",
        formato: "a5",
      }, { modo: "imprimir" });
    })();
  };

  const { abrirPedido, dialogos: dialogosPedido } = usePedidoPracticas(paciente);

  const abrirDocumentos = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    setDocElegido("");
    setDocManual(false);
    setManualTitulo("");
    setManualContenido("");
    setDocsAbierto(true);
  };

  /** Documento escrito a mano para un caso puntual: no se guarda, solo se imprime. */
  const generarDocumentoManual = () => {
    if (!paciente || !manualContenido.trim()) return;
    setDocsAbierto(false);
    void (async () => {
      const medico = await datosMedicoReceta();
      const fecha = new Date();
      await generarRecetaPDF({
        paciente,
        contenido: completarDocumento(manualContenido, {
          nombrePaciente: `${paciente.apellido}, ${paciente.nombre}`,
          dniPaciente: paciente.dni,
          fechaNacimiento: paciente.fecha_nacimiento,
          matriculaMedico: medico?.matricula ?? null,
          fecha,
        }),
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: manualTitulo.trim() || "Documento",
      }, { modo: "imprimir" });
    })();
  };

  const generarDocumento = () => {
    const doc = (documentos.data ?? []).find((d) => d.id === docElegido);
    if (!paciente || !doc) return;
    setDocsAbierto(false);
    void (async () => {
      const medico = await datosMedicoReceta();
      const fecha = new Date();
      await generarRecetaPDF({
        paciente,
        contenido: completarDocumento(doc.contenido, {
          nombrePaciente: `${paciente.apellido}, ${paciente.nombre}`,
          dniPaciente: paciente.dni,
          fechaNacimiento: paciente.fecha_nacimiento,
          matriculaMedico: medico?.matricula ?? null,
          fecha,
        }),
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: doc.nombre,
      }, { modo: "imprimir" });
    })();
  };

  /** Resumen legible de una consulta (draft o historia guardada) en texto plano. */
  const resumenConsulta = (h: Record<string, unknown>): string => {
    const t = (k: string) => String(h[k] ?? "").trim();
    const n = (k: string) => (h[k] === null || h[k] === undefined || h[k] === "" ? "" : String(h[k]));
    const partes: string[] = [];
    const push = (label: string, valor: string) => {
      if (valor) partes.push(`${label}:\n${valor}`);
    };
    push("Motivo de consulta", t("motivo_consulta"));
    push("Antecedentes personales", t("antecedentes_personales"));
    push("Antecedentes familiares", t("antecedentes_familiares"));
    push("Antecedentes oftalmológicos", t("antecedentes_oftalmologicos"));
    push("Evolución clínica", t("evolucion_clinica"));
    const refraccion = [
      t("refraccion_od") ? `Lejos O.D. ${t("refraccion_od")}` : "",
      t("refraccion_oi") ? `Lejos O.I. ${t("refraccion_oi")}` : "",
      t("refraccion_cerca_od") ? `Cerca O.D. ${t("refraccion_cerca_od")}` : "",
      t("refraccion_cerca_oi") ? `Cerca O.I. ${t("refraccion_cerca_oi")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    push("Refracción", refraccion);
    const pio =
      n("pio_od") || n("pio_oi")
        ? `O.D. ${n("pio_od") || "—"} / O.I. ${n("pio_oi") || "—"}${t("pio_hora") ? ` (${t("pio_hora")})` : ""}`
        : "";
    push("PIO", pio);
    push("Campo visual", t("campo_visual_obs"));
    push("Diagnóstico", t("diagnostico"));
    push("Tratamiento", t("tratamiento"));
    push("Próxima cita", t("proxima_cita"));
    return partes.join("\n\n") || "Sin datos cargados.";
  };

  const fechaLegible = (valor?: string | null) => {
    if (!valor) return new Date().toLocaleDateString("es-AR");
    const d = parsearFechaLocal(String(valor).slice(0, 10));
    return isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString("es-AR");
  };

  /** PDF con la consulta que se está viendo/escribiendo. */
  const imprimirHistoriaDelDia = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    void (async () => {
      const medico = await datosMedicoReceta();
      const contenido = `FECHA: ${fechaLegible(draft.fecha)}\n\n${resumenConsulta(draft as unknown as Record<string, unknown>)}`;
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: "Historia clínica",
      }, { modo: "imprimir" });
    })();
  };

  /** PDF con todas las consultas del paciente, de la más vieja a la más nueva. */
  const imprimirHistoriaCompleta = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    void (async () => {
      try {
        const [medico, historias] = await Promise.all([
          datosMedicoReceta(),
          listHistoriasPaciente(paciente.id),
        ]);
        const ordenadas = [...historias].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
        if (ordenadas.length === 0) {
          toast.error("El paciente no tiene consultas registradas");
          return;
        }
        const contenido = ordenadas
          .map(
            (h) =>
              `--------------------------------------------\nCONSULTA DEL ${fechaLegible(h.fecha).toUpperCase()}\n--------------------------------------------\n\n${resumenConsulta(
                h as unknown as Record<string, unknown>,
              )}`,
          )
          .join("\n\n\n");
        await generarRecetaPDF({
          paciente,
          contenido,
          fecha: new Date(),
          plantilla: plantillas.data?.[0] ?? null,
          medico,
          titulo: "Historia clínica completa",
        }, { modo: "imprimir" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo generar la historia completa");
      }
    })();
  };




  return (
    <div>
      <PageHeader
        title="Historia Clínica"
        description="Dictá desordenado; la IA distribuye cada dato en el campo correcto."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="size-4" /> Receta PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => receta(false)}>Con indicaciones (paciente)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => receta(true)}>Solo medicamentos, sin indicaciones (farmacia)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={recetaOptica}>
              <Glasses className="size-4" /> Receta óptica
            </Button>
            <Button variant="outline" size="sm" onClick={() => abrirPedido("Estudios y Prácticas")}>
              <ClipboardList className="size-4" /> Pedido de estudios
            </Button>
            <Button variant="outline" size="sm" onClick={() => abrirPedido("Laboratorio")}>
              <ClipboardList className="size-4" /> Laboratorio
            </Button>
            <Button variant="outline" size="sm" onClick={() => abrirPedido("Otros estudios complementarios")}>
              <ClipboardList className="size-4" /> Otros estudios complementarios
            </Button>
            <Button variant="outline" size="sm" onClick={() => abrirPedido("Cirugías")}>
              <ClipboardList className="size-4" /> Pedido de cirugía
            </Button>
            <Button variant="outline" size="sm" onClick={pedidoEcg} disabled={!paciente}>
              <ClipboardList className="size-4" /> ECG
            </Button>
            <Button variant="outline" size="sm" onClick={pedidoVasculitisUveitis} disabled={!paciente}>
              <ClipboardList className="size-4" /> Vasculitis/Uveítis
            </Button>
            <Button variant="outline" size="sm" onClick={pedidoLaboratorioPrequirurgico} disabled={!paciente}>
              <ClipboardList className="size-4" /> Laboratorio Prequirúrgico
            </Button>
            <Button variant="outline" size="sm" onClick={imprimirHistoriaDelDia} disabled={!paciente}>
              <Printer className="size-4" /> Imprimir historia del día
            </Button>
            <Button variant="outline" size="sm" onClick={imprimirHistoriaCompleta} disabled={!paciente}>
              <Printer className="size-4" /> Imprimir historia completa
            </Button>
            <Button variant="outline" size="sm" onClick={abrirDocumentos}>
              <FileSignature className="size-4" /> Consentimientos y protocolos
            </Button>
            {isMedico && (
              <>
                <span className="self-center text-xs text-muted-foreground">
                  {autoEstado === "guardando" ? "Guardando…" : autoEstado === "guardado" ? "Guardado" : ""}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={confirmarDescarte}
                  disabled={!historiaId || descartar.isPending}
                >
                  {descartar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Descartar consulta
                </Button>
                <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
                  {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="panel mb-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select
              value={pacienteId}
              onValueChange={(v) => {
                setPacienteId(v);
                if (historiaDeUrl) {
                  setHistoriaDeUrl(undefined);
                  setHistoriaId(undefined);
                  setDraft(HISTORIA_VACIA);
                  setTranscripcion("");
                  void navigate({ to: "/consulta", search: { paciente: v, historia: undefined }, replace: true });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegí un paciente" />
              </SelectTrigger>
              <SelectContent>
                {(pacientes.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.apellido}, {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paciente?.fecha_nacimiento && calcularEdad(paciente.fecha_nacimiento) ? (
              <p className="text-xs text-muted-foreground">
                {paciente.apellido}, {paciente.nombre} — {calcularEdad(paciente.fecha_nacimiento)}
              </p>
            ) : null}
          </div>

          {isMedico && (
          <div className="space-y-1.5">
            <Label htmlFor="dictado">Dictado libre</Label>
            <Textarea
              id="dictado"
              rows={4}
              placeholder="Paciente refiere visión borrosa de lejos hace dos meses, PIO 14 y 15 a las diez y media, fondo de ojo normal…"
              value={transcripcion}
              onChange={(e) => setTranscripcion(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant={grabando ? "destructive" : "outline"} size="sm" onClick={alternar}>
                {grabando ? <Square className="size-4" /> : <Mic className="size-4" />}
                {grabando ? "Detener" : "Dictar"}
              </Button>
              <Button size="sm" onClick={() => ordenar.mutate()} disabled={ordenar.isPending || transcripcion.trim().length < 5}>
                {ordenar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Ordenar con IA
              </Button>
            </div>
          </div>
          )}
        </div>

        {pacienteId ? (
          <details className="mt-4 rounded-lg border border-border/60 p-3" open>
            <summary className="cursor-pointer text-sm font-medium">
              Consultas anteriores{" "}
              <span className="text-xs text-muted-foreground">({(historiasPaciente.data ?? []).length})</span>
            </summary>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant={hayConsultaDeHoy ? "outline" : "default"}
                size="sm"
                onClick={nuevaConsulta}
                disabled={!isMedico}
              >
                Nueva consulta
              </Button>
              {!hayConsultaDeHoy && isMedico ? (
                <span className="text-xs text-muted-foreground">No hay consulta de hoy para este paciente.</span>
              ) : null}

              {historiasPaciente.isLoading ? (
                <span className="text-xs text-muted-foreground">Cargando…</span>
              ) : null}
            </div>
            <ul className="mt-3 max-h-56 space-y-1 overflow-auto">
              {(historiasPaciente.data ?? []).map((h) => {
                const activa = h.id === historiaDeUrl || h.id === historiaId;
                const resumen = (h.diagnostico ?? "").trim();
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => abrirConsulta(h.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                        activa ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <span className="mr-2">
                        {h.fecha ? formatearFechaLocal(h.fecha) : "Sin fecha"}
                      </span>
                      <span className="text-muted-foreground">
                        {resumen ? resumen.slice(0, 70) : "Sin diagnóstico"}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!historiasPaciente.isLoading && (historiasPaciente.data ?? []).length === 0 ? (
                <li className="px-2 py-1 text-xs text-muted-foreground">Sin consultas previas.</li>
              ) : null}
            </ul>
          </details>
        ) : null}
      </div>


      {historiaDeUrl ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Editando consulta
          {historiaExistente.data?.fecha
            ? ` del ${formatearFechaLocal(historiaExistente.data.fecha)}`
            : ""}
        </div>
      ) : null}

      <HistoriaForm
        value={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        historiaId={historiaId}
        obraSocial={paciente?.obra_social ?? null}
        soloLectura={!isMedico}
        pacienteId={pacienteId}
      />

      {dialogosPedido}

      <Dialog open={docsAbierto} onOpenChange={setDocsAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consentimientos y protocolos</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={docManual ? "outline" : "secondary"}
              size="sm"
              onClick={() => setDocManual(false)}
            >
              Documentos precargados
            </Button>
            <Button
              variant={docManual ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDocManual(true)}
            >
              <FileSignature className="size-4" /> Escribir documento manual
            </Button>
          </div>

          {docManual ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-titulo">Título del documento</Label>
                <Input
                  id="manual-titulo"
                  placeholder="Autorización especial - motivo"
                  value={manualTitulo}
                  onChange={(e) => setManualTitulo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-contenido">Contenido</Label>
                <Textarea
                  id="manual-contenido"
                  rows={10}
                  placeholder="Escribí el texto del documento. Podés usar [NOMBRE_PACIENTE], [DNI_PACIENTE], [FECHA] y [MATRICULA_MEDICO]."
                  value={manualContenido}
                  onChange={(e) => setManualContenido(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="max-h-72 space-y-4 overflow-y-auto">
              {(documentos.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay documentos cargados. Agregalos en “Consentimientos y protocolos”.
                </p>
              ) : null}
              {TIPOS_DOCUMENTO.map((t) => {
                const items = (documentos.data ?? []).filter((d) => (d.tipo as DocumentoTipo) === t.value);
                if (items.length === 0) return null;
                return (
                  <div key={t.value} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</p>
                    {items.map((d) => (
                      <label key={d.id} className="flex cursor-pointer items-center gap-3 text-sm">
                        <input
                          type="radio"
                          name="documento"
                          className="accent-primary"
                          checked={docElegido === d.id}
                          onChange={() => setDocElegido(d.id)}
                        />
                        <span className="min-w-0 font-medium">{d.nombre}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDocsAbierto(false)}>
              Cancelar
            </Button>
            {docManual ? (
              <Button size="sm" onClick={generarDocumentoManual} disabled={!manualContenido.trim()}>
                <FileDown className="size-4" /> Generar PDF
              </Button>
            ) : (
              <Button size="sm" onClick={generarDocumento} disabled={!docElegido}>
                <FileDown className="size-4" /> Generar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
