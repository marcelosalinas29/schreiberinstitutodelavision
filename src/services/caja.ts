import { supabase } from "@/integrations/supabase/client";
import type { CierreCaja, CobroConPaciente, CobroInsert, MedioPago } from "@/types/domain";

const SELECT = "*, paciente:pacientes(id, nombre, apellido)";

export async function listCobrosPorFecha(fecha: string): Promise<CobroConPaciente[]> {
  const { data, error } = await supabase
    .from("cobros")
    .select(SELECT)
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CobroConPaciente[];
}

export async function listCobrosPorRango(desde: string, hasta: string): Promise<CobroConPaciente[]> {
  const { data, error } = await supabase
    .from("cobros")
    .select(SELECT)
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CobroConPaciente[];
}

export async function createCobro(values: CobroInsert): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("cobros").insert({ ...values, created_by: auth.user?.id ?? null });
  if (error) throw error;
}

export async function deleteCobro(id: string): Promise<void> {
  const { error } = await supabase.from("cobros").delete().eq("id", id);
  if (error) throw error;
}

export interface TotalesCaja {
  porMedio: Record<MedioPago, number>;
  total: number;
  cantidad: number;
}

export function calcularTotales(cobros: { medio: MedioPago; monto: number }[]): TotalesCaja {
  const porMedio: Record<MedioPago, number> = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    mercado_pago: 0,
  };
  let total = 0;
  for (const cobro of cobros) {
    const monto = Number(cobro.monto) || 0;
    porMedio[cobro.medio] += monto;
    total += monto;
  }
  return { porMedio, total, cantidad: cobros.length };
}

export async function listCierres(): Promise<CierreCaja[]> {
  const { data, error } = await supabase
    .from("cierres_caja")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function cerrarCaja(input: {
  fecha: string;
  turnoLabel: string;
  totales: TotalesCaja;
  observaciones?: string;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("cierres_caja").insert({
    fecha: input.fecha,
    turno_label: input.turnoLabel,
    total_efectivo: input.totales.porMedio.efectivo,
    total_transferencia: input.totales.porMedio.transferencia,
    total_tarjeta: input.totales.porMedio.tarjeta,
    total_mercado_pago: input.totales.porMedio.mercado_pago,
    total_general: input.totales.total,
    observaciones: input.observaciones ?? null,
    cerrado_por: auth.user?.id ?? null,
  });
  if (error) throw error;
}
