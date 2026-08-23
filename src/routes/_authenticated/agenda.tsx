import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageCircle, Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientForm } from "@/features/patients/PatientForm";
import { listPacientes } from "@/services/pacientes";
import { armarLinkRecordatorioTurno } from "@/lib/whatsapp";
import { createTurno, deleteTurno, listTurnosPorRango, setEstadoTurno } from "@/services/turnos";
import { ESTADOS_TURNO, type Paciente, type TurnoEstado } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de turnos — Schreiber Instituto de la Visión" },
      { name: "description", content: "Programá turnos, controlá la sala de espera y actualizá el estado de cada paciente." },
      { property: "og:title", content: "Agenda de turnos — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Turnos del día con estados en vivo: pendiente, en espera, en consulta y atendido." },
    ],
  }),
  component: Agenda,
});

const turnoSchema = z.object({
  fecha: z.string().min(10),
  hora: z.string().min(4),
  duracion_min: z.coerce.number().int().min(5).max(240),
  motivo: z.string().trim().max(200).optional(),
  notas: z.string().trim().max(1000).optional(),
});

const TURNO_VACIO = { hora: "09:00", duracion_min: "20", motivo: "", notas: "" };

function Agenda() {
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(TURNO_VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [creandoPaciente, setCreandoPaciente] = useState(false);

  const turnos = useQuery({
    queryKey: ["turnos", fecha],
    queryFn: () => listTurnosPorRango(`${fecha}T00:00:00`, `${fecha}T23:59:59`),
  });
  const pacientes = useQuery({ queryKey: ["pacientes", busqueda], queryFn: () => listPacientes(busqueda) });

  const resultados = useMemo(() => (pacientes.data ?? []).slice(0, 8), [pacientes.data]);

  const cerrar = () => {
    setOpen(false);
    setForm(TURNO_VACIO);
    setBusqueda("");
    setPaciente(null);
    setCreandoPaciente(false);
  };

  const agendar = async (pacienteId: string) => {
    const parsed = turnoSchema.parse({ ...form, fecha });
    await createTurno({
      paciente_id: pacienteId,
      inicio: new Date(`${parsed.fecha}T${parsed.hora}`).toISOString(),
      duracion_min: parsed.duracion_min,
      motivo: parsed.motivo || null,
      notas: parsed.notas || null,
    });
  };

  const crear = useMutation({
    mutationFn: async (pacienteId: string) => agendar(pacienteId),
    onSuccess: () => {
      toast.success("Turno agendado");
      cerrar();
      void qc.invalidateQueries({ queryKey: ["turnos"] });
      void qc.invalidateQueries({ queryKey: ["pacientes"] });
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

  const camposTurno = (
    <>
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
    </>
  );

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Turnos del día seleccionado y estado de la sala de espera."
        actions={
          <>
            <Input type="date" className="w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : cerrar())}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" /> Nuevo turno
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo turno · {fecha}</DialogTitle>
                </DialogHeader>

                {creandoPaciente ? (
                  <div className="space-y-5">
                    <div className="space-y-4">{camposTurno}</div>
                    <div className="rounded-lg border border-border p-4">
                      <h3 className="mb-3 text-sm font-semibold">Datos del nuevo paciente</h3>
                      <PatientForm
                        defaults={{ dni: /^\d+$/.test(busqueda.trim()) ? busqueda.trim() : "" }}
                        submitLabel="Guardar paciente y agendar"
                        onCancel={() => setCreandoPaciente(false)}
                        onAbrirExistente={(p) => {
                          setPaciente(p);
                          setCreandoPaciente(false);
                        }}
                        onSaved={(p) => {
                          setPaciente(p);
                          setCreandoPaciente(false);
                          crear.mutate(p.id);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="buscar-paciente">Paciente</Label>
                      {paciente ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                          <span>
                            <strong>
                              {paciente.apellido}, {paciente.nombre}
                            </strong>
                            {paciente.dni ? ` · DNI ${paciente.dni}` : ""}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => setPaciente(null)}>
                            Cambiar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="buscar-paciente"
                              className="pl-9"
                              placeholder="Buscar por DNI, nombre o apellido"
                              value={busqueda}
                              onChange={(e) => setBusqueda(e.target.value)}
                            />
                          </div>
                          <div className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                            {resultados.length === 0 ? (
                              <p className="p-3 text-sm text-muted-foreground">Sin resultados.</p>
                            ) : (
                              resultados.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => setPaciente(p)}
                                  className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent/60"
                                >
                                  {p.apellido}, {p.nombre}
                                  <span className="ml-2 text-xs text-muted-foreground">{p.dni ? `DNI ${p.dni}` : "Sin DNI"}</span>
                                </button>
                              ))
                            )}
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => setCreandoPaciente(true)}>
                            <UserPlus className="size-4" /> Crear nuevo paciente
                          </Button>
                        </>
                      )}
                    </div>
                    {camposTurno}
                  </div>
                )}

                {!creandoPaciente ? (
                  <DialogFooter>
                    <Button
                      onClick={() => (paciente ? crear.mutate(paciente.id) : toast.error("Elegí un paciente"))}
                      disabled={crear.isPending}
                    >
                      Agendar
                    </Button>
                  </DialogFooter>
                ) : null}
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
              <Button
                variant="outline"
                size="sm"
                disabled={!turno.paciente?.telefono}
                title={turno.paciente?.telefono ? "Enviar recordatorio por WhatsApp" : "Paciente sin teléfono cargado"}
                onClick={() => {
                  const tel = turno.paciente?.telefono;
                  if (!tel) return;
                  const fechaHora = new Date(turno.inicio).toLocaleString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const url = armarLinkRecordatorioTurno(
                    tel,
                    `${turno.paciente?.nombre ?? ""} ${turno.paciente?.apellido ?? ""}`.trim(),
                    fechaHora,
                  );
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <MessageCircle className="size-4" /> WhatsApp
              </Button>
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
