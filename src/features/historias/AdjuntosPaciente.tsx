import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/useAuth";
import {
  eliminarAdjuntoEstudio,
  listAdjuntosPaciente,
  subirAdjuntoPaciente,
  urlFirmadaImagenHistoria,
  type HistoriaAdjunto,
} from "@/services/historias";

/** Estudios que el paciente trae en papel, subidos a su ficha por cualquier persona del staff. */
export function AdjuntosPaciente({ pacienteId }: { pacienteId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { isMedico } = useCurrentUser();
  const [subiendo, setSubiendo] = useState(false);
  const [items, setItems] = useState<HistoriaAdjunto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const recargar = async (id: string) => {
    const filas = await listAdjuntosPaciente(id);
    setItems(filas);
    const pares = await Promise.all(
      filas.map(async (f) => [f.id, (await urlFirmadaImagenHistoria(f.path)) ?? ""] as const),
    );
    setUrls(Object.fromEntries(pares));
  };

  useEffect(() => {
    if (!pacienteId) {
      setItems([]);
      return;
    }
    void recargar(pacienteId);
  }, [pacienteId]);

  const subir = async (files: FileList) => {
    setSubiendo(true);
    try {
      for (const file of Array.from(files)) {
        await subirAdjuntoPaciente(file, pacienteId);
      }
      await recargar(pacienteId);
      toast.success("Estudio adjuntado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (id: string) => {
    try {
      await eliminarAdjuntoEstudio(id);
      await recargar(pacienteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el adjunto");
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold">Estudios adjuntos del paciente</h3>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={subiendo}
          onClick={() => input.current?.click()}
        >
          {subiendo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Adjuntar estudio
        </Button>
        <p className="text-xs text-muted-foreground">Imágenes o PDF, podés subir varios.</p>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {urls[a.id] && !a.path.toLowerCase().endsWith(".pdf") ? (
                  <img src={urls[a.id]} alt={a.nombre_archivo ?? "Adjunto"} className="size-full object-cover" />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.nombre_archivo ?? "Archivo adjunto"}</p>
                {urls[a.id] ? (
                  <a href={urls[a.id]} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Ver archivo
                  </a>
                ) : null}
              </div>
              {isMedico ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void borrar(a.id)}>
                  Eliminar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void subir(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
