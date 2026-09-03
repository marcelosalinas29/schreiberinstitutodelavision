import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { formatearFechaLocal, hoyISO } from "@/lib/fecha";
import { crearTarea, eliminarTarea, listTareas, marcarTareaCompletada, type TareaPendiente } from "@/services/tareas";

function ordenar(tareas: TareaPendiente[]): TareaPendiente[] {
  return [...tareas].sort((a, b) => {
    if (!a.fecha && !b.fecha) return a.created_at.localeCompare(b.created_at);
    if (!a.fecha) return 1;
    if (!b.fecha) return -1;
    return a.fecha.localeCompare(b.fecha);
  });
}

function etiquetaFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const hoy = hoyISO();
  if (fecha === hoy) return "Hoy";
  if (fecha < hoy) return `Vencida · ${new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function TareasPendientes() {
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [fecha, setFecha] = useState("");

  const tareas = useQuery({ queryKey: ["tareas-pendientes"], queryFn: () => listTareas(true) });
  const invalidar = () => qc.invalidateQueries({ queryKey: ["tareas-pendientes"] });

  const agregar = useMutation({
    mutationFn: () => crearTarea(texto.trim(), fecha || null),
    onSuccess: () => {
      setTexto("");
      setFecha("");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const completar = useMutation({
    mutationFn: (id: string) => marcarTareaCompletada(id),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => eliminarTarea(id),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const lista = ordenar(tareas.data ?? []);

  return (
    <section className="panel mt-6 p-4">
      <h2 className="mb-4 text-sm font-semibold">Tareas pendientes</h2>

      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          agregar.mutate();
        }}
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nueva tarea o recordatorio…"
          className="flex-1"
        />
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="sm:w-44" />
        <Button type="submit" size="sm" disabled={!texto.trim() || agregar.isPending}>
          <Plus className="size-4" /> Agregar
        </Button>
      </form>

      {tareas.isLoading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Cargando tareas…</p>
      ) : lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No hay tareas pendientes.</p>
      ) : (
        <ul className="divide-y divide-border">
          {lista.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <Checkbox checked={false} onCheckedChange={() => completar.mutate(t.id)} aria-label="Marcar completada" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.texto}</p>
                <p className="text-xs text-muted-foreground">{etiquetaFecha(t.fecha)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => borrar.mutate(t.id)} aria-label="Eliminar tarea">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
