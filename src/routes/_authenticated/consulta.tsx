import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Save, Sparkles, Square, FileDown, ClipboardList, FileSignature, Printer, MessageCircle, Glasses } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORIA_VACIA, HistoriaForm, type HistoriaDraft } from "@/features/historias/HistoriaForm";
import { HistoricoPIO } from "@/features/historias/HistoricoPIO";
import { parseDictado } from "@/lib/ai.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { recetaSoloMedicamentos } from "@/lib/utils";
import { generarRecetaPDF } from "@/lib/pdf";
import { armarLinkWhatsAppTexto } from "@/lib/whatsapp";
import { datosMedicoReceta } from "@/services/perfil";
import { createHistoria, getHistoria, updateHistoria } from "@/services/historias";
import { listPacientes } from "@/services/pacientes";
import { listPlantillas } from "@/services/plantillas";
import type { PracticaEstudio } from "@/types/domain";
import {
  idsPracticasUsadas,
  listPracticas,
  agruparPracticas,
  practicasOrdenadasPorUso,
  practicasParaObraSocial,
  registrarUsoPractica,
} from "@/services/practicas";
import { TIPOS_DOCUMENTO, completarDocumento, listDocumentos } from "@/services/documentosClinicos";
import type { DocumentoTipo } from "@/types/domain";

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
  const { paciente: pacienteDeUrl, historia: historiaDeUrl } = Route.useSearch();
  const [pacienteId, setPacienteId] = useState(pacienteDeUrl ?? "");
  const [transcripcion, setTranscripcion] = useState("");
  const [draft, setDraft] = useState<HistoriaDraft>(HISTORIA_VACIA);
  const [pedidoAbierto, setPedidoAbierto] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [docsAbierto, setDocsAbierto] = useState(false);
  const [docElegido, setDocElegido] = useState("");
  const [docManual, setDocManual] = useState(false);
  const [manualTitulo, setManualTitulo] = useState("");
  const [manualContenido, setManualContenido] = useState("");

  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
  const practicas = useQuery({ queryKey: ["practicas"], queryFn: listPracticas });
  const documentos = useQuery({ queryKey: ["documentos-clinicos"], queryFn: listDocumentos });
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


  const { grabando, alternar } = useDictado((texto) => setTranscripcion((prev) => `${prev} ${texto}`.trim()));

  const parse = useServerFn(parseDictado);
  const ordenar = useMutation({
    mutationFn: () => parse({ data: { transcripcion } }),
    onSuccess: (data) => {
      setDraft((prev) => ({ ...prev, ...data, fecha: prev.fecha ?? new Date().toISOString().slice(0, 10) }));
      toast.success("Dictado ordenado en los campos clínicos");
    },
    onError: () => toast.error("No se pudo procesar el dictado"),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!pacienteId) throw new Error("Elegí un paciente");
      if (historiaDeUrl) {
        await updateHistoria(historiaDeUrl, { ...draft, dictado_crudo: transcripcion || null });
        return;
      }
      await createHistoria({ ...draft, paciente_id: pacienteId, dictado_crudo: transcripcion || null });
    },
    onSuccess: () => {
      toast.success(historiaDeUrl ? "Consulta actualizada" : "Historia clínica guardada");
      if (!historiaDeUrl) {
        setDraft(HISTORIA_VACIA);
        setTranscripcion("");
      }
      void qc.invalidateQueries({ queryKey: ["historias"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar"),
  });

  const receta = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido: draft.tratamiento || draft.diagnostico || "",
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        formato: "a5",
      });
    })();
  };

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
      `Diagnóstico: ${(draft.diagnostico ?? "").trim() || "—"}`,
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
      });
    })();
  };

  const basePracticas = practicasParaObraSocial(practicas.data ?? [], paciente?.obra_social ?? null);
  const [ordenPedido, setOrdenPedido] = useState<PracticaEstudio[] | null>(null);
  const [pedidoListo, setPedidoListo] = useState<{ contenido: string; fecha: Date } | null>(null);
  const [usadasAntes, setUsadasAntes] = useState<string[]>([]);
  const disponibles = ordenPedido ?? basePracticas;

  const abrirPedido = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    setSeleccionadas([]);
    setOrdenPedido(null);
    setUsadasAntes([]);
    setPedidoAbierto(true);
    void (async () => {
      try {
        const [ordenadas, usados] = await Promise.all([
          practicasOrdenadasPorUso(basePracticas, paciente.id),
          idsPracticasUsadas(paciente.id),
        ]);
        setOrdenPedido(ordenadas);
        setUsadasAntes(usados);
      } catch (e) {
        console.error(e);
      }
    })();
  };

  const generarPedido = () => {
    if (!paciente || seleccionadas.length === 0) return;
    const elegidas = disponibles.filter((p) => seleccionadas.includes(p.id));
    const contenido = elegidas
      .map((p) => `• ${p.nombre}${p.codigo ? ` (${p.codigo})` : ""}\n${p.contenido}`)
      .join("\n\n");
    setPedidoAbierto(false);
    const fecha = new Date();
    setPedidoListo({ contenido, fecha });
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: "Pedido de estudios",
        formato: "a5",
      });
      // Memoria de uso: no debe interrumpir la generación del PDF.
      await Promise.all(
        elegidas.map((p) =>
          registrarUsoPractica(p.id, paciente.id).catch((e: unknown) => console.error(e)),
        ),
      );
    })();
  };

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
          matriculaMedico: medico?.matricula ?? null,
          fecha,
        }),
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: manualTitulo.trim() || "Documento",
      });
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
          matriculaMedico: medico?.matricula ?? null,
          fecha,
        }),
        fecha,
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: doc.nombre,
      });
    })();
  };


  return (
    <div>
      <PageHeader
        title="Historia Clínica"
        description="Dictá desordenado; la IA distribuye cada dato en el campo correcto."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={receta}>
              <FileDown className="size-4" /> Receta PDF
            </Button>
            <Button variant="outline" size="sm" onClick={recetaOptica}>
              <Glasses className="size-4" /> Receta óptica
            </Button>
            <Button variant="outline" size="sm" onClick={abrirPedido}>
              <ClipboardList className="size-4" /> Pedido de estudios
            </Button>
            <Button variant="outline" size="sm" onClick={abrirDocumentos}>
              <FileSignature className="size-4" /> Consentimientos y protocolos
            </Button>
            <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
            </Button>
          </>
        }
      />

      <div className="panel mb-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Select value={pacienteId} onValueChange={setPacienteId}>
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
          </div>

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
        </div>
      </div>

      {historiaDeUrl ? (
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Editando consulta
          {historiaExistente.data?.fecha
            ? ` del ${new Date(historiaExistente.data.fecha).toLocaleDateString("es-AR")}`
            : ""}
        </div>
      ) : null}

      {pacienteId ? <HistoricoPIO pacienteId={pacienteId} className="panel mb-4 p-4" /> : null}

      <HistoriaForm
        value={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        obraSocial={paciente?.obra_social ?? null}
      />

      <Dialog open={pedidoAbierto} onOpenChange={setPedidoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido de estudios</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {paciente?.obra_social ? `Obra social: ${paciente.obra_social}` : "Paciente particular / sin obra social"}
          </p>
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {disponibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay prácticas cargadas. Agregalas en la pantalla “Prácticas y estudios”.
              </p>
            ) : null}
            {agruparPracticas(disponibles).map(([grupo, items]) => (
              <div key={grupo} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{grupo}</p>
                {items.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={seleccionadas.includes(p.id)}
                      onCheckedChange={(v) =>
                        setSeleccionadas((prev) => (v ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                      }
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{p.nombre}</span>
                      {p.codigo ? <span className="ml-2 text-xs text-muted-foreground">{p.codigo}</span> : null}
                      {usadasAntes.includes(p.id) ? (
                        <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                          Pedido antes
                        </span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">{p.contenido}</span>
                    </span>
                  </label>
                ))}
              </div>
            ))}

          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPedidoAbierto(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={generarPedido} disabled={seleccionadas.length === 0}>
              <FileDown className="size-4" /> Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pedidoListo !== null} onOpenChange={(v) => (v ? null : setPedidoListo(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedido de estudios generado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El PDF ya se descargó. También podés imprimirlo o avisarle al paciente por WhatsApp (el aviso es solo texto:
            el PDF no se adjunta automáticamente).
          </p>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!paciente || !pedidoListo) return;
                void (async () => {
                  const medico = await datosMedicoReceta();
                  await generarRecetaPDF(
                    {
                      paciente,
                      contenido: pedidoListo.contenido,
                      fecha: pedidoListo.fecha,
                      plantilla: plantillas.data?.[0] ?? null,
                      medico,
                      titulo: "Pedido de estudios",
                      formato: "a5",
                    },
                    { modo: "imprimir" },
                  );
                })();
              }}
            >
              <Printer className="size-4" /> Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!paciente || !pedidoListo) return;
                void (async () => {
                  const medico = await datosMedicoReceta();
                  await generarRecetaPDF({
                    paciente,
                    contenido: pedidoListo.contenido,
                    fecha: pedidoListo.fecha,
                    plantilla: plantillas.data?.[0] ?? null,
                    medico,
                    titulo: "Pedido de estudios",
                    formato: "a5",
                  });
                })();
              }}
            >
              <FileDown className="size-4" /> Descargar
            </Button>
            {paciente?.telefono ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!paciente?.telefono || !pedidoListo) return;
                  const mensaje = `Hola ${paciente.nombre}, tiene listo su pedido de estudios de ${pedidoListo.fecha.toLocaleDateString("es-AR")}. Puede pasar a buscarlo o coordinar el envío por este medio.`;
                  window.open(
                    armarLinkWhatsAppTexto(paciente.telefono, mensaje),
                    "_blank",
                    "noopener,noreferrer",
                  );
                }}
              >
                <MessageCircle className="size-4" /> Enviar por WhatsApp
              </Button>
            ) : null}
            <Button size="sm" onClick={() => setPedidoListo(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
