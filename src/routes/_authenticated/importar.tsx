import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ScanLine, Save, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HISTORIA_VACIA, HistoriaForm, type HistoriaDraft } from "@/features/historias/HistoriaForm";
import { parseDocumento } from "@/lib/ai.functions";
import { createHistoria } from "@/services/historias";
import { createPaciente, listPacientes } from "@/services/pacientes";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar fichas antiguas — Riz Oftalmología" },
      { name: "description", content: "Subí fichas en papel escaneadas o PDF y la IA genera un borrador editable de historia clínica." },
      { property: "og:title", content: "Importar fichas antiguas — Riz Oftalmología" },
      { property: "og:description", content: "Digitalización asistida por IA de historias clínicas previas con revisión manual." },
    ],
  }),
  component: Importar,
});

const MAX_BYTES = 8 * 1024 * 1024;

function leerArchivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function Importar() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [resumen, setResumen] = useState("");
  const [draft, setDraft] = useState<HistoriaDraft>(HISTORIA_VACIA);
  const [pacienteId, setPacienteId] = useState("");
  const [sugerido, setSugerido] = useState<{ nombre?: string; apellido?: string; dni?: string; obra_social?: string } | null>(null);

  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const parse = useServerFn(parseDocumento);

  const analizar = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Elegí un archivo");
      if (file.size > MAX_BYTES) throw new Error("El archivo supera los 8 MB");
      const dataUrl = await leerArchivo(file);
      return parse({ data: { fileName: file.name, mimeType: file.type || "application/pdf", dataUrl } });
    },
    onSuccess: (data) => {
      const { historia, paciente, resumen: texto } = data;
      setDraft((prev) => ({ ...prev, ...historia, fecha: historia.fecha ?? prev.fecha ?? new Date().toISOString().slice(0, 10) }));
      setSugerido(paciente ?? null);
      setResumen(texto ?? "");
      const coincidencia = (pacientes.data ?? []).find(
        (p) => (paciente?.dni && p.dni === paciente.dni) || (paciente?.apellido && p.apellido.toLowerCase() === paciente.apellido.toLowerCase()),
      );
      if (coincidencia) setPacienteId(coincidencia.id);
      toast.success("Documento procesado. Revisá el borrador antes de guardar.");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo procesar el documento"),
  });

  const crearPacienteSugerido = useMutation({
    mutationFn: async () => {
      if (!sugerido?.nombre || !sugerido.apellido) throw new Error("El documento no trae nombre y apellido");
      return createPaciente({
        nombre: sugerido.nombre,
        apellido: sugerido.apellido,
        dni: sugerido.dni ?? null,
        obra_social: sugerido.obra_social ?? null,
      });
    },
    onSuccess: (paciente) => {
      setPacienteId(paciente.id);
      void qc.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success("Paciente creado desde el documento");
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo crear el paciente"),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!pacienteId) throw new Error("Elegí o creá el paciente");
      await createHistoria({ ...draft, paciente_id: pacienteId });
    },
    onSuccess: () => {
      toast.success("Historia importada");
      setDraft(HISTORIA_VACIA);
      setResumen("");
      setFile(null);
      void qc.invalidateQueries({ queryKey: ["historias"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "No se pudo guardar"),
  });

  return (
    <div>
      <PageHeader
        title="Importar fichas previas"
        description="Foto o PDF de la ficha en papel → borrador editable de historia clínica."
        actions={
          <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
            {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar historia
          </Button>
        }
      />

      <div className="panel mb-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-1.5">
            <Label htmlFor="archivo">Documento (JPG, PNG o PDF, hasta 8 MB)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="archivo"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <Button onClick={() => analizar.mutate()} disabled={analizar.isPending || !file}>
                {analizar.isPending ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />} Analizar
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Paciente destino</Label>
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
            {sugerido?.apellido && !pacienteId ? (
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => crearPacienteSugerido.mutate()}>
                <Upload className="size-4" /> Crear «{sugerido.apellido}, {sugerido.nombre}»
              </Button>
            ) : null}
          </div>
        </div>

        {resumen ? <p className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{resumen}</p> : null}
      </div>

      <HistoriaForm value={draft} onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))} />
    </div>
  );
}
