import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarHeart, ChevronLeft, ChevronRight, FileText, Lock, MessageCircle, Plus, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientForm } from "@/features/patients/PatientForm";
import { listPacientes } from "@/services/pacientes";
import { armarLinkRecordatorioTurno } from "@/lib/whatsapp";
import { crearBloqueo, crearEventoPersonal, createTurno, deleteTurno, listTurnosPorRango, setEstadoTurno } from "@/services/turnos";
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

const HORARIOS_MANANA = [
  "07:45",
  "08:00",
  "08:20",
  "08:40",
  "09:00",
  "09:20",
  "09:40",
  "10:00",
  "10:20",
  "10:40",
  "11:00",
  "11:20",
  "11:40",
  "12:00",
  "12:20",
];
const TARDE_LUN_MIE = ["16:15", "16:35", "16:55", "17:15", "17:35", "17:55", "18:15"];
const TARDE_JUE = ["16:00", "16:20", "16:40", "17:00", "17:20", "17:40", "18:00", "18:20", "18:40", "19:00", "19:20"];

function horariosDisponibles(fechaISO: string): string[] {
  if (!fechaISO) return [];
  const dia = desdeISO(fechaISO).getDay(); // 0 dom … 6 sáb
  if (dia === 0 || dia === 6) return [];
  const tarde = dia === 1 || dia === 3 ? TARDE_LUN_MIE : dia === 4 ? TARDE_JUE : [];
  return [...HORARIOS_MANANA, ...tarde];
}


const TURNO_VACIO = { hora: "07:45", duracion_min: "20", motivo: "", notas: "" };
const EVENTO_VACIO = { fecha: "", hora: "09:00", duracion_min: "60", titulo: "" };
const BLOQUEO_VACIO = { fecha: "", hora_inicio: "08:00", hora_fin: "12:30", motivo: "" };

type TipoTurno = "turno" | "evento_personal" | "bloqueo";
const tipoDe = (t: { tipo?: string | null }): TipoTurno => ((t.tipo ?? "turno") as TipoTurno);
const esEspecial = (t: { tipo?: string | null }) => tipoDe(t) !== "turno";
const etiquetaEspecial = (t: { tipo?: string | null; motivo?: string | null }) =>
  t.motivo || (tipoDe(t) === "bloqueo" ? "Bloqueado" : "Cita personal");
const claseEspecial = (t: { tipo?: string | null }) =>
  tipoDe(t) === "bloqueo"
    ? "border-destructive/40 bg-destructive/10"
    : tipoDe(t) === "evento_personal"
      ? "border-primary/40 bg-primary/10"
      : "";
const aMinutos = (hhmmStr: string) => {
  const [h, m] = hhmmStr.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

type Vista = "dia" | "semana" | "mes";

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const desdeISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};
const sumarDias = (s: string, n: number) => {
  const d = desdeISO(s);
  d.setDate(d.getDate() + n);
  return aISO(d);
};
const sumarMeses = (s: string, n: number) => {
  const d = desdeISO(s);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return aISO(d);
};
const lunesDe = (s: string) => {
  const d = desdeISO(s);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return aISO(d);
};
const inicioMes = (s: string) => {
  const d = desdeISO(s);
  d.setDate(1);
  return aISO(d);
};
const finMes = (s: string) => {
  const d = desdeISO(s);
  d.setMonth(d.getMonth() + 1, 0);
  return aISO(d);
};
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });


function Agenda() {
  const qc = useQueryClient();
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(TURNO_VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [creandoPaciente, setCreandoPaciente] = useState(false);
  const [vista, setVista] = useState<Vista>("dia");
  const [guardia, setGuardia] = useState(false);
  const [openEvento, setOpenEvento] = useState(false);
  const [formEvento, setFormEvento] = useState(EVENTO_VACIO);
  const [openBloqueo, setOpenBloqueo] = useState(false);
  const [formBloqueo, setFormBloqueo] = useState(BLOQUEO_VACIO);

  const turnos = useQuery({
    queryKey: ["turnos", fecha],
    queryFn: () => listTurnosPorRango(`${fecha}T00:00:00`, `${fecha}T23:59:59`),
  });

  const lunes = lunesDe(fecha);
  const domingo = sumarDias(lunes, 6);
  const turnosSemana = useQuery({
    queryKey: ["turnos", "semana", lunes],
    queryFn: () => listTurnosPorRango(`${lunes}T00:00:00`, `${sumarDias(domingo, 1)}T00:00:00`),
    enabled: vista === "semana",
  });

  const primerDiaMes = inicioMes(fecha);
  const ultimoDiaMes = finMes(fecha);
  const turnosMes = useQuery({
    queryKey: ["turnos", "mes", primerDiaMes],
    queryFn: () => listTurnosPorRango(`${primerDiaMes}T00:00:00`, `${sumarDias(ultimoDiaMes, 1)}T00:00:00`),
    enabled: vista === "mes",
  });

  const porDiaSemana = useMemo(() => {
    const mapa: Record<string, typeof turnosSemana.data> = {};
    for (let i = 0; i < 7; i++) mapa[sumarDias(lunes, i)] = [];
    for (const t of turnosSemana.data ?? []) {
      const k = aISO(new Date(t.inicio));
      (mapa[k] ??= []).push(t);
    }
    return mapa;
  }, [turnosSemana.data, lunes]);

  const conteoMes = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const t of turnosMes.data ?? []) {
      const k = aISO(new Date(t.inicio));
      mapa[k] = (mapa[k] ?? 0) + 1;
    }
    return mapa;
  }, [turnosMes.data]);

  const celdasMes = useMemo(() => {
    const inicio = lunesDe(primerDiaMes);
    const celdas: string[] = [];
    for (let i = 0; i < 42; i++) celdas.push(sumarDias(inicio, i));
    while (celdas.length > 35 && desdeISO(celdas[35]!).getMonth() !== desdeISO(primerDiaMes).getMonth()) celdas.pop();
    return celdas.slice(0, celdas.length > 35 ? 42 : 35);
  }, [primerDiaMes]);
  const pacientes = useQuery({ queryKey: ["pacientes", busqueda], queryFn: () => listPacientes(busqueda) });

  const resultados = useMemo(() => (pacientes.data ?? []).slice(0, 8), [pacientes.data]);

  const cerrar = () => {
    setOpen(false);
    setForm(TURNO_VACIO);
    setBusqueda("");
    setPaciente(null);
    setCreandoPaciente(false);
    setGuardia(false);
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

  const crearEvento = useMutation({
    mutationFn: async () => {
      const f = formEvento.fecha || fecha;
      if (!formEvento.titulo.trim()) throw new Error("Poné un título");
      return crearEventoPersonal(f, formEvento.hora, Number(formEvento.duracion_min) || 60, formEvento.titulo.trim());
    },
    onSuccess: () => {
      toast.success("Cita personal agendada");
      setOpenEvento(false);
      setFormEvento(EVENTO_VACIO);
      void qc.invalidateQueries({ queryKey: ["turnos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo agendar la cita"),
  });

  const crearBloqueoM = useMutation({
    mutationFn: async () =>
      crearBloqueo(formBloqueo.fecha || fecha, formBloqueo.hora_inicio, formBloqueo.hora_fin, formBloqueo.motivo),
    onSuccess: () => {
      toast.success("Horario bloqueado");
      setOpenBloqueo(false);
      setFormBloqueo(BLOQUEO_VACIO);
      void qc.invalidateQueries({ queryKey: ["turnos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo bloquear el horario"),
  });

  const bloqueosDelDia = useMemo(
    () => (turnos.data ?? []).filter((t) => tipoDe(t) === "bloqueo"),
    [turnos.data],
  );

  const horarios = useMemo(() => {
    const base = horariosDisponibles(fecha);
    if (bloqueosDelDia.length === 0) return base;
    const rangos = bloqueosDelDia.map((b) => {
      const d = new Date(b.inicio);
      const desde = d.getHours() * 60 + d.getMinutes();
      return [desde, desde + (b.duracion_min ?? 0)] as const;
    });
    return base.filter((h) => {
      const m = aMinutos(h);
      return !rangos.some(([desde, hasta]) => m >= desde && m < hasta);
    });
  }, [fecha, bloqueosDelDia]);

  const camposTurno = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="hora">Hora</Label>
          {guardia || horarios.length === 0 ? (
            <Input id="hora" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          ) : (
            <Select value={form.hora} onValueChange={(v) => setForm({ ...form, hora: v })}>
              <SelectTrigger id="hora">
                <SelectValue placeholder="Elegí un horario" />
              </SelectTrigger>
              <SelectContent>
                {horarios.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <label className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <Checkbox checked={guardia} onCheckedChange={(v) => setGuardia(v === true)} />
            Turno de guardia (horario libre)
          </label>
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

      <Tabs value={vista} onValueChange={(v) => setVista(v as Vista)} className="mb-4">
        <TabsList>
          <TabsTrigger value="dia">Día</TabsTrigger>
          <TabsTrigger value="semana">Semana</TabsTrigger>
          <TabsTrigger value="mes">Mes</TabsTrigger>
        </TabsList>
      </Tabs>

      {vista === "semana" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, -7))}>
              <ChevronLeft className="size-4" /> Semana anterior
            </Button>
            <p className="text-sm font-medium">
              {desdeISO(lunes).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} —{" "}
              {desdeISO(domingo).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <Button variant="outline" size="sm" onClick={() => setFecha(sumarDias(fecha, 7))}>
              Semana siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
          {turnosSemana.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando turnos…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((dia, i) => (
                <div key={dia} className="panel p-3">
                  <button
                    className="mb-2 w-full text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFecha(dia);
                      setVista("dia");
                    }}
                  >
                    {DIAS[i]} {desdeISO(dia).getDate()}
                  </button>
                  {(porDiaSemana[dia] ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(porDiaSemana[dia] ?? []).map((t) => (
                        <li key={t.id}>
                          <button
                            onClick={() => {
                              setFecha(dia);
                              setVista("dia");
                            }}
                            className="w-full rounded-md border border-border px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60"
                          >
                            <span className="font-semibold tabular-nums">{hhmm(t.inicio)}</span>{" "}
                            {t.paciente ? `${t.paciente.apellido}, ${t.paciente.nombre}` : "Sin paciente"}
                            {t.motivo ? <span className="block text-muted-foreground">{t.motivo}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : vista === "mes" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setFecha(sumarMeses(fecha, -1))}>
              <ChevronLeft className="size-4" /> Mes anterior
            </Button>
            <p className="text-sm font-medium capitalize">
              {desdeISO(primerDiaMes).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
            </p>
            <Button variant="outline" size="sm" onClick={() => setFecha(sumarMeses(fecha, 1))}>
              Mes siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
          {turnosMes.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando turnos…</p>
          ) : (
            <div className="panel p-3">
              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
                {DIAS.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {celdasMes.map((dia) => {
                  const delMes = desdeISO(dia).getMonth() === desdeISO(primerDiaMes).getMonth();
                  const cant = conteoMes[dia] ?? 0;
                  return (
                    <button
                      key={dia}
                      onClick={() => {
                        setFecha(dia);
                        setVista("dia");
                      }}
                      className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md border border-border text-sm transition-colors hover:bg-accent/60 ${
                        delMes ? "" : "opacity-40"
                      } ${dia === fecha ? "ring-2 ring-primary" : ""}`}
                    >
                      <span className="tabular-nums">{desdeISO(dia).getDate()}</span>
                      {cant > 0 ? (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {cant}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : turnos.isLoading ? (
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
              {turno.paciente_id ? (
                <Button variant="outline" size="sm" asChild title="Abrir historia clínica de este paciente">
                  <Link to="/consulta" search={{ paciente: turno.paciente_id }}>
                    <FileText className="size-4" /> Historia clínica
                  </Link>
                </Button>
              ) : null}
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
