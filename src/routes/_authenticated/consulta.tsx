import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, Mic, Save, Sparkles, Square, FileDown, ClipboardList, FileSignature } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORIA_VACIA, HistoriaForm, type HistoriaDraft } from "@/features/historias/HistoriaForm";
import { parseDictado } from "@/lib/ai.functions";
import { generarRecetaPDF } from "@/lib/pdf";
import { datosMedicoReceta } from "@/services/perfil";
import { createHistoria } from "@/services/historias";
import { listPacientes } from "@/services/pacientes";
import { listPlantillas } from "@/services/plantillas";
import { listPracticas, practicasParaObraSocial } from "@/services/practicas";
import { TIPOS_DOCUMENTO, completarDocumento, listDocumentos } from "@/services/documentosClinicos";
import type { DocumentoTipo } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/consulta")({
  validateSearch: (search: Record<string, unknown>): { paciente: string } => ({
    paciente: typeof search["paciente"] === "string" ? search["paciente"] : "",
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
  const { paciente: pacienteDeUrl } = Route.useSearch();
  const [pacienteId, setPacienteId] = useState(pacienteDeUrl ?? "");
  const [transcripcion, setTranscripcion] = useState("");
  const [draft, setDraft] = useState<HistoriaDraft>(HISTORIA_VACIA);
  const [pedidoAbierto, setPedidoAbierto] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [docsAbierto, setDocsAbierto] = useState(false);
  const [docElegido, setDocElegido] = useState("");

  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
  const practicas = useQuery({ queryKey: ["practicas"], queryFn: listPracticas });
  const documentos = useQuery({ queryKey: ["documentos-clinicos"], queryFn: listDocumentos });
  const paciente = (pacientes.data ?? []).find((p) => p.id === pacienteId) ?? null;

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
      await createHistoria({ ...draft, paciente_id: pacienteId, dictado_crudo: transcripcion || null });
    },
    onSuccess: () => {
      toast.success("Historia clínica guardada");
      setDraft(HISTORIA_VACIA);
      setTranscripcion("");
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

  const disponibles = practicasParaObraSocial(practicas.data ?? [], paciente?.obra_social ?? null);

  const abrirPedido = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    setSeleccionadas([]);
    setPedidoAbierto(true);
  };

  const generarPedido = () => {
    if (!paciente || seleccionadas.length === 0) return;
    const elegidas = disponibles.filter((p) => seleccionadas.includes(p.id));
    const contenido = elegidas
      .map((p) => `• ${p.nombre}${p.codigo ? ` (${p.codigo})` : ""}\n${p.contenido}`)
      .join("\n\n");
    setPedidoAbierto(false);
    void (async () => {
      const medico = await datosMedicoReceta();
      await generarRecetaPDF({
        paciente,
        contenido,
        fecha: new Date(),
        plantilla: plantillas.data?.[0] ?? null,
        medico,
        titulo: "Pedido de estudios",
        formato: "a5",
      });
    })();
  };

  const abrirDocumentos = () => {
    if (!paciente) {
      toast.error("Elegí un paciente");
      return;
    }
    setDocElegido("");
    setDocsAbierto(true);
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
        title="Consulta"
        description="Dictá desordenado; la IA distribuye cada dato en el campo correcto."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={receta}>
              <FileDown className="size-4" /> Receta PDF
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

      <HistoriaForm value={draft} onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))} />

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
            {disponibles.map((p) => (
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
                  <span className="block text-xs text-muted-foreground">{p.contenido}</span>
                </span>
              </label>
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

      <Dialog open={docsAbierto} onOpenChange={setDocsAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Consentimientos y protocolos</DialogTitle>
          </DialogHeader>
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
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDocsAbierto(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={generarDocumento} disabled={!docElegido}>
              <FileDown className="size-4" /> Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
