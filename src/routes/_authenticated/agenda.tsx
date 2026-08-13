import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listPacientes } from "@/services/pacientes";
import { createTurno, deleteTurno, listTurnosPorRango, setEstadoTurno } from "@/services/turnos";
import { ESTADOS_TURNO, type TurnoEstado } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de turnos — Riz Oftalmología" },
      { name: "description", content: "Programá turnos, controlá la sala de espera y actualizá el estado de cada paciente." },
      { property: "og:title", content: "Agenda de turnos — Riz Oftalmología" },
      { property: "og:description", content: "Turnos del día con estados en vivo: pendiente, en espera, en consulta y atendido." },
    ],
  }),
  component: Agenda,
});

const turnoSchema = z.object({
  paciente_id: z.string().uuid("Elegí un paciente"),
  fecha: z.string().min(10),
  hora: z.string().min(4),
  duracion_min: z.coerce.number().int().min(5).max(240),
  motivo: z.string().trim().max(200).optional(),
  notas: z.string().trim().max(1000).optional(),
});

function Agenda() {
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ paciente_id: "", hora: "09:00", duracion_min: "20", motivo: "", notas: "" });

  const turnos = useQuery({
    queryKey: ["turnos", fecha],
    queryFn: () => listTurnosPorRango(`${fecha}T00:00:00`, `${fecha}T23:59:59`),
  });
  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });

  const crear = useMutation({
    mutationFn: async () => {
      const parsed = turnoSchema.parse({ ...form, fecha });
      await createTurno({
        paciente_id: parsed.paciente_id,
        inicio: new Date(`${parsed.fecha}T${parsed.hora}`).toISOString(),
        duracion_min: parsed.duracion_min,
        motivo: parsed.motivo || null,
        notas: parsed.notas || null,
      });
    },
    onSuccess: () => {
      toast.success("Turno agendado");
      setOpen(false);
      setForm({ paciente_id: "", hora: "09:00", duracion_min: "20", motivo: "", notas: "" });
      void qc.invalidateQueries({ queryKey: ["turnos"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof z.ZodError ? (error.issues[0]?.message ?? "Datos inválidos") : "No se pudo agendar el turno");
    },
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: TurnoEstado }) => setEstadoTurno(id, estado),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["turnos"] }),
    onError: () => toast.error("No se pudo actualizar el estado"),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => deleteTurno(id),
    onSuccess: () => {
      toast.success("Turno eliminado");
      void qc.invalidateQueries({ queryKey: ["turnos"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Turnos del día seleccionado y estado de la sala de espera."
        actions={
          <>
            <Input type="date" className="w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" /> Nuevo turno
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo turno · {fecha}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Paciente</Label>
                    <Select value={form.paciente_id} onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="hora">Hora</Label>
                      <Input id="hora" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dur">Duración (min)</Label>
                      <Input id="dur" type="number" min={5} step={5} value={form.duracion_min} onChange={(e) => setForm({ ...form, duracion_min: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="motivo-turno">Motivo</Label>
                    <Input id="motivo-turno" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notas-turno">Notas</Label>
                    <Textarea id="notas-turno" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => crear.mutate()} disabled={crear.isPending}>
                    Agendar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      {turnos.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Cargando turnos…</p>
      ) : (turnos.data?.length ?? 0) === 0 ? (
        <div className="panel p-10 text-center text-sm text-muted-foreground">No hay turnos para esta fecha.</div>
      ) : (
        <div className="space-y-2">
          {turnos.data!.map((turno) => (
            <article key={turno.id} className="panel flex flex-wrap items-center gap-3 p-4">
              <span className="w-14 shrink-0 text-sm font-semibold tabular-nums">
                {new Date(turno.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">
                  {turno.paciente ? `${turno.paciente.apellido}, ${turno.paciente.nombre}` : "Sin paciente"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {turno.duracion_min} min{turno.motivo ? ` · ${turno.motivo}` : ""}
                  {turno.paciente?.obra_social ? ` · ${turno.paciente.obra_social}` : ""}
                </p>
              </div>
              <Select value={turno.estado} onValueChange={(v) => cambiarEstado.mutate({ id: turno.id, estado: v as TurnoEstado })}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_TURNO.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" onClick={() => eliminar.mutate(turno.id)}>
                Eliminar
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
