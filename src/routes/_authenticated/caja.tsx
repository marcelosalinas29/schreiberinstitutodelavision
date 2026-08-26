import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileText, Lock, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  calcularTotales,
  cerrarCaja,
  crearCobroConMultiplesPagos,
  deleteCobro,
  exportarCobrosCSV,
  listCierres,
  listCobrosPorFecha,
  urlFirmadaComprobante,
  type PagoLinea,
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
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
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
  const cierres = useQuery({ queryKey: ["cierres"], queryFn: listCierres });

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
            <Input type="date" className="w-40" value={fecha} onChange={(e) => setFecha(e.target.value)} />
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
                    <Label>Medio de pago</Label>
                    <Select value={form.medio} onValueChange={(v) => setForm({ ...form, medio: v as MedioPago })}>
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="monto">Monto</Label>
                    <Input id="monto" type="number" min={0} step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="os">Obra social</Label>
                    <Input id="os" value={form.obra_social} onChange={(e) => setForm({ ...form, obra_social: e.target.value })} />
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
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {MEDIOS_PAGO.map((m) => (
          <StatCard key={m.value} label={m.label} value={money(totales.porMedio[m.value])} />
        ))}
        <StatCard label="Total del día" value={money(totales.total)} hint={`${totales.cantidad} movimientos`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
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
                    <Button variant="ghost" size="icon" aria-label="Eliminar cobro" onClick={() => borrar.mutate(c.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

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
                  {new Date(`${c.fecha}T12:00:00`).toLocaleDateString("es-AR")} · {c.turno_label}
                </span>
                <span className="font-medium tabular-nums">{money(Number(c.total_general))}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
