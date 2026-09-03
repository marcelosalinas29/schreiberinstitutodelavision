import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Download, FileText, Lock, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/useAuth";
import { armarLinkWhatsAppTexto } from "@/lib/whatsapp";

import {
  calcularTotales,
  cerrarCaja,
  crearCobroConMultiplesPagos,
  crearPendiente,
  deleteCobro,
  eliminarPendiente,
  exportarCobrosCSV,
  listCierres,
  listCobrosPorFecha,
  listPendientes,
  marcarPendienteResuelto,
  urlFirmadaComprobante,
  type PagoLinea,
  type TipoPendiente,
} from "@/services/caja";
import { listPacientes } from "@/services/pacientes";
import { MEDIOS_PAGO, TIPOS_COBRO, type MedioPago, type TipoCobro } from "@/types/domain";


export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({
    meta: [
      { title: "Caja y liquidación — Schreiber Instituto de la Visión" },
      { name: "description", content: "Registro de copagos, bonos y coseguros con arqueo diario por medio de pago." },
      { property: "og:title", content: "Caja y liquidación — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Control de ingresos del consultorio y cierre de caja por turno." },
    ],
  }),
  component: Caja,
});

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const cobroSchema = z.object({
  concepto: z.string().trim().max(200).optional(),
  obra_social: z.string().trim().max(120).optional(),
});

interface LineaPagoForm {
  medio: MedioPago;
  monto: string;
}

function Caja() {
  const qc = useQueryClient();
  const { isMedico } = useCurrentUser();
  const hoy = hoyISO();
  const [fechaSel, setFecha] = useState(() => hoy);
  const fecha = isMedico ? fechaSel : hoy;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    paciente_id: "",
    tipo: "consulta_particular" as TipoCobro,
    concepto: "",
    obra_social: "",
  });
  const [lineas, setLineas] = useState<LineaPagoForm[]>([{ medio: "efectivo", monto: "" }]);
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [turnoLabel, setTurnoLabel] = useState("Mañana");
  const [observaciones, setObservaciones] = useState("");

  const cobros = useQuery({ queryKey: ["cobros", fecha], queryFn: () => listCobrosPorFecha(fecha) });
  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });
  const cierres = useQuery({ queryKey: ["cierres"], queryFn: listCierres, enabled: isMedico });

  const totales = calcularTotales(cobros.data ?? []);
  const totalFormulario = lineas.reduce((acc, l) => acc + (Number(l.monto) || 0), 0);

  const registrar = useMutation({
    mutationFn: async () => {
      const parsed = cobroSchema.parse(form);
      const pagos: PagoLinea[] = lineas
        .map((l) => ({ medio: l.medio, monto: Number(l.monto) || 0 }))
        .filter((p) => p.monto > 0);
      if (pagos.length === 0) throw new Error("Agregá al menos una forma de pago con monto");
      await crearCobroConMultiplesPagos(form.paciente_id || null, fecha, pagos, comprobante, {
        tipo: form.tipo,
        concepto: parsed.concepto || null,
        obra_social: parsed.obra_social || null,
      });
    },
    onSuccess: () => {
      toast.success("Cobro registrado");
      setOpen(false);
      setForm({ ...form, concepto: "" });
      setLineas([{ medio: "efectivo", monto: "" }]);
      setComprobante(null);
      void qc.invalidateQueries({ queryKey: ["cobros"] });
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Datos inválidos")
          : error instanceof Error
            ? error.message
            : "No se pudo registrar",
      ),
  });

  const exportar = useMutation({
    mutationFn: () => exportarCobrosCSV(cobros.data ?? []),
    onError: () => toast.error("No se pudo exportar"),
  });

  async function verComprobante(path: string) {
    const url = await urlFirmadaComprobante(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("No se pudo abrir el comprobante");
  }


  const borrar = useMutation({
    mutationFn: (id: string) => deleteCobro(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cobros"] }),
    onError: () => toast.error("No se pudo eliminar"),
  });

  const cerrar = useMutation({
    mutationFn: () => cerrarCaja({ fecha, turnoLabel, totales, observaciones }),
    onSuccess: () => {
      toast.success("Caja cerrada");
      setObservaciones("");
      void qc.invalidateQueries({ queryKey: ["cierres"] });
    },
    onError: () => toast.error("No se pudo cerrar la caja"),
  });

  return (
    <div>
      <PageHeader
        title="Caja"
        description="Ingresos del día por medio de pago y cierre administrativo."
        actions={
          <>
            {isMedico && (
              <Input type="date" className="w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" /> Registrar cobro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo cobro · {fecha}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Paciente (opcional)</Label>
                    <Select value={form.paciente_id} onValueChange={(v) => setForm({ ...form, paciente_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin asociar" />
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
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoCobro })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_COBRO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="os">Obra social</Label>
                    <Input id="os" value={form.obra_social} onChange={(e) => setForm({ ...form, obra_social: e.target.value })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Formas de pago</Label>
                    {lineas.map((linea, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Select
                          value={linea.medio}
                          onValueChange={(v) =>
                            setLineas(lineas.map((l, j) => (j === i ? { ...l, medio: v as MedioPago } : l)))
                          }
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEDIOS_PAGO.map((m) => (
                              <SelectItem key={m.value} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Monto"
                          aria-label={`Monto ${i + 1}`}
                          value={linea.monto}
                          onChange={(e) => setLineas(lineas.map((l, j) => (j === i ? { ...l, monto: e.target.value } : l)))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Quitar forma de pago"
                          disabled={lineas.length === 1}
                          onClick={() => setLineas(lineas.filter((_, j) => j !== i))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLineas([...lineas, { medio: "efectivo", monto: "" }])}
                      >
                        <Plus className="size-4" /> Agregar forma de pago
                      </Button>
                      <span className="text-sm font-semibold tabular-nums">Total: {money(totalFormulario)}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="comprobante">Comprobante de pago (imagen o PDF)</Label>
                    <Input
                      id="comprobante"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="concepto">Concepto</Label>
                    <Input id="concepto" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
                  </div>

                </div>
                <DialogFooter>
                  <Button onClick={() => registrar.mutate()} disabled={registrar.isPending}>
                    Registrar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {isMedico && (
              <Button size="sm" variant="outline" onClick={() => exportar.mutate()} disabled={exportar.isPending}>
                <Download className="size-4" /> Exportar CSV
              </Button>
            )}

          </>
        }
      />

      {isMedico && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {MEDIOS_PAGO.map((m) => (
            <StatCard key={m.value} label={m.label} value={money(totales.porMedio[m.value])} />
          ))}
          <StatCard label="Total del día" value={money(totales.total)} hint={`${totales.cantidad} movimientos`} />
        </div>
      )}


      <div className={`mt-6 grid gap-4 ${isMedico ? "lg:grid-cols-[1.4fr_1fr]" : ""}`}>
        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Movimientos</h2>
          {cobros.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : (cobros.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin cobros registrados en esta fecha.</p>
          ) : (
            <ul className="divide-y divide-border">
              {cobros.data!.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {c.paciente ? `${c.paciente.apellido}, ${c.paciente.nombre}` : (c.concepto ?? "Sin paciente")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TIPOS_COBRO.find((t) => t.value === c.tipo)?.label} · {MEDIOS_PAGO.find((m) => m.value === c.medio)?.label}
                      {c.obra_social ? ` · ${c.obra_social}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums">{money(Number(c.monto))}</span>
                    {c.comprobante_url ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ver comprobante"
                        onClick={() => void verComprobante(c.comprobante_url!)}
                      >
                        <FileText className="size-4" />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" aria-label="Eliminar cobro" onClick={() => borrar.mutate(c.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isMedico && (
        <section className="panel h-fit p-4">

          <h2 className="mb-3 text-sm font-semibold">Cierre de caja</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Turno</Label>
              <Select value={turnoLabel} onValueChange={setTurnoLabel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Día completo">Día completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observaciones</Label>
              <Textarea id="obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
            <Button className="w-full" onClick={() => cerrar.mutate()} disabled={cerrar.isPending || totales.cantidad === 0}>
              <Lock className="size-4" /> Cerrar caja por {money(totales.total)}
            </Button>
          </div>

          <h3 className="mb-2 mt-6 text-sm font-semibold">Últimos cierres</h3>
          <ul className="space-y-2">
            {(cierres.data ?? []).slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {formatearFechaLocal(c.fecha)} · {c.turno_label}
                </span>
                <span className="font-medium tabular-nums">{money(Number(c.total_general))}</span>
              </li>
            ))}
          </ul>
        </section>
        )}

      </div>

      <PendientesPanel />
    </div>
  );
}

const TIPOS_PENDIENTE: { value: TipoPendiente; label: string }[] = [
  { value: "dinero", label: "Dinero" },
  { value: "autorizacion", label: "Autorización" },
];

function PendientesPanel() {
  const qc = useQueryClient();
  const [verResueltos, setVerResueltos] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ paciente_id: "", tipo: "dinero" as TipoPendiente, concepto: "", monto: "" });

  const pendientes = useQuery({
    queryKey: ["caja-pendientes", verResueltos],
    queryFn: () => listPendientes(!verResueltos),
  });
  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });

  const crear = useMutation({
    mutationFn: async () => {
      if (!nuevo.paciente_id) throw new Error("Elegí un paciente");
      if (!nuevo.concepto.trim()) throw new Error("Escribí el concepto");
      await crearPendiente(
        nuevo.paciente_id,
        nuevo.tipo,
        nuevo.concepto.trim(),
        nuevo.monto ? Number(nuevo.monto) : null,
      );
    },
    onSuccess: () => {
      toast.success("Pendiente registrado");
      setOpenNuevo(false);
      setNuevo({ paciente_id: "", tipo: "dinero", concepto: "", monto: "" });
      void qc.invalidateQueries({ queryKey: ["caja-pendientes"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo registrar"),
  });

  const resolver = useMutation({
    mutationFn: (id: string) => marcarPendienteResuelto(id),
    onSuccess: () => {
      toast.success("Marcado como resuelto");
      void qc.invalidateQueries({ queryKey: ["caja-pendientes"] });
    },
    onError: () => toast.error("No se pudo actualizar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => eliminarPendiente(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["caja-pendientes"] }),
    onError: () => toast.error("No se pudo eliminar"),
  });

  return (
    <section className="panel mt-6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Pendientes</h2>
          <p className="text-xs text-muted-foreground">Pacientes que quedan a deber o con autorización de obra social pendiente.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setVerResueltos((v) => !v)}>
            {verResueltos ? "Ver solo activos" : "Ver historial completo"}
          </Button>
          <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Nuevo pendiente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo pendiente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Paciente</Label>
                  <Select value={nuevo.paciente_id} onValueChange={(v) => setNuevo({ ...nuevo, paciente_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir paciente" />
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
                  <Label>Tipo</Label>
                  <Select value={nuevo.tipo} onValueChange={(v) => setNuevo({ ...nuevo, tipo: v as TipoPendiente })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_PENDIENTE.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pend-monto">Monto (opcional)</Label>
                  <Input
                    id="pend-monto"
                    type="number"
                    min={0}
                    step="0.01"
                    value={nuevo.monto}
                    onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pend-concepto">Concepto</Label>
                  <Input
                    id="pend-concepto"
                    value={nuevo.concepto}
                    onChange={(e) => setNuevo({ ...nuevo, concepto: e.target.value })}
                    placeholder="Ej.: saldo de consulta / autorización de cirugía"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => crear.mutate()} disabled={crear.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendientes.isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : (pendientes.data?.length ?? 0) === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay pendientes registrados.</p>
      ) : (
        <ul className="divide-y divide-border">
          {pendientes.data!.map((p) => {
            const nombre = p.paciente ? `${p.paciente.apellido}, ${p.paciente.nombre}` : "Paciente";
            const mensaje = `Hola ${p.paciente?.nombre ?? ""}, le recordamos que tiene pendiente ${p.concepto}${
              p.tipo === "dinero" && p.monto != null ? ` por $${Number(p.monto)}` : ""
            }. Por favor contáctenos para resolverlo.`;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {nombre}
                    {p.resuelto ? <span className="ml-2 text-xs text-muted-foreground">(resuelto)</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.tipo === "dinero" ? "Dinero" : "Autorización"} · {p.concepto}
                    {p.monto != null ? ` · ${money(Number(p.monto))}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.paciente?.telefono ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(armarLinkWhatsAppTexto(p.paciente!.telefono!, mensaje), "_blank", "noopener")
                      }
                    >
                      <MessageCircle className="size-4" /> Recordar por WhatsApp
                    </Button>
                  ) : null}
                  {!p.resuelto ? (
                    <Button size="sm" variant="secondary" onClick={() => resolver.mutate(p.id)} disabled={resolver.isPending}>
                      <Check className="size-4" /> Marcar resuelto
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" aria-label="Eliminar pendiente" onClick={() => borrar.mutate(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

