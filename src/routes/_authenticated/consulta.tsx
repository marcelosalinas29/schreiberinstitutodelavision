import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, Mic, Save, Sparkles, Square, FileDown } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORIA_VACIA, HistoriaForm, type HistoriaDraft } from "@/features/historias/HistoriaForm";
import { parseDictado } from "@/lib/ai.functions";
import { generarRecetaPDF } from "@/lib/pdf";
import { createHistoria } from "@/services/historias";
import { listPacientes } from "@/services/pacientes";
import { listPlantillas } from "@/services/plantillas";

export const Route = createFileRoute("/_authenticated/consulta")({
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
  const [pacienteId, setPacienteId] = useState("");
  const [transcripcion, setTranscripcion] = useState("");
  const [draft, setDraft] = useState<HistoriaDraft>(HISTORIA_VACIA);

  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
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
    void generarRecetaPDF({
      paciente,
      contenido: draft.tratamiento || draft.diagnostico || "",
      fecha: new Date(),
      plantilla: plantillas.data?.[0] ?? null,
    });
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
    </div>
  );
}
