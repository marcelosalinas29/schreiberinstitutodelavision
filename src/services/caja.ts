import { supabase } from "@/integrations/supabase/client";
import { BUCKET_MEDICAL } from "@/services/perfil";
import type { CierreCaja, CobroConPaciente, CobroInsert, MedioPago, Tables } from "@/types/domain";

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

/* ----------------------------------------------------------------------------
 * ADITIVO: cobros con varias formas de pago, comprobante adjunto y export CSV.
 * No modifica ninguna función ni columna existente.
 * -------------------------------------------------------------------------- */

import { BUCKET_MEDICAL } from "@/services/perfil";

export interface PagoLinea {
  medio: MedioPago;
  monto: number;
}

export type CobroPago = Tables["cobros_pagos"]["Row"];

/** Sube el comprobante de pago (imagen o PDF) a la carpeta del usuario. */
async function subirComprobante(file: File, cobroId: string): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${uid}/comprobante-${cobroId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_MEDICAL).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return path;
}

/**
 * Registra un cobro con una o varias formas de pago.
 * `cobros.medio` guarda el medio de mayor monto y `cobros.monto` el TOTAL,
 * para que los reportes y el cierre de caja existentes sigan funcionando igual.
 */
export async function crearCobroConMultiplesPagos(
  pacienteId: string | null,
  fecha: string,
  pagos: PagoLinea[],
  comprobanteFile?: File | null,
  extra?: { tipo?: CobroInsert["tipo"]; concepto?: string | null; obra_social?: string | null; turno_id?: string | null },
): Promise<string> {
  const limpios = pagos.filter((p) => Number(p.monto) > 0);
  if (limpios.length === 0) throw new Error("Agregá al menos una forma de pago con monto");

  const total = limpios.reduce((acc, p) => acc + Number(p.monto), 0);
  const principal = limpios.reduce((mejor, p) => (Number(p.monto) > Number(mejor.monto) ? p : mejor), limpios[0]!);
  const mediosDistintos = new Set(limpios.map((p) => p.medio)).size;
  const empate = limpios.filter((p) => Number(p.monto) === Number(principal.monto)).length > 1;
  const medio: MedioPago = empate && mediosDistintos > 1 ? "efectivo" : principal.medio;

  await createCobro({
    fecha,
    medio,
    monto: total,
    paciente_id: pacienteId,
    tipo: extra?.tipo ?? "consulta_particular",
    concepto: extra?.concepto ?? null,
    obra_social: extra?.obra_social ?? null,
    turno_id: extra?.turno_id ?? null,
  });

  const { data: auth } = await supabase.auth.getUser();
  const { data: creado, error: errBuscar } = await supabase
    .from("cobros")
    .select("id")
    .eq("fecha", fecha)
    .eq("created_by", auth.user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (errBuscar) throw errBuscar;
  const cobroId = creado?.id;
  if (!cobroId) throw new Error("No se pudo recuperar el cobro recién creado");

  const { error: errPagos } = await supabase
    .from("cobros_pagos")
    .insert(limpios.map((p) => ({ cobro_id: cobroId, medio: p.medio, monto: Number(p.monto) })));
  if (errPagos) throw errPagos;

  if (comprobanteFile) {
    const path = await subirComprobante(comprobanteFile, cobroId);
    const { error: errUp } = await supabase.from("cobros").update({ comprobante_url: path }).eq("id", cobroId);
    if (errUp) throw errUp;
  }

  return cobroId;
}

/** Detalle de formas de pago de un cobro. */
export async function listPagosDeCobro(cobroId: string): Promise<CobroPago[]> {
  const { data, error } = await supabase
    .from("cobros_pagos")
    .select("*")
    .eq("cobro_id", cobroId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** URL temporal firmada para ver el comprobante adjunto. */
export async function urlFirmadaComprobante(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET_MEDICAL).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

const ETIQUETA_MEDIO: Record<MedioPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercado_pago: "Mercado Pago",
};

function celdaCSV(valor: string | number): string {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

/** Exporta los cobros indicados a un CSV que se abre directo en Excel. */
export async function exportarCobrosCSV(cobros: CobroConPaciente[]): Promise<void> {
  const ids = cobros.map((c) => c.id);
  const detalle = new Map<string, CobroPago[]>();
  if (ids.length > 0) {
    const { data } = await supabase.from("cobros_pagos").select("*").in("cobro_id", ids);
    for (const fila of data ?? []) {
      const lista = detalle.get(fila.cobro_id) ?? [];
      lista.push(fila);
      detalle.set(fila.cobro_id, lista);
    }
  }

  const encabezado = ["Fecha", "Paciente", "Tipo", "Medio", "Monto", "Formas de pago", "Obra social", "Concepto"];
  const filas = cobros.map((c) => {
    const pagos = detalle.get(c.id) ?? [];
    const desglose = pagos.length
      ? pagos.map((p) => `${ETIQUETA_MEDIO[p.medio]}: ${Number(p.monto).toFixed(2)}`).join(" + ")
      : `${ETIQUETA_MEDIO[c.medio]}: ${Number(c.monto).toFixed(2)}`;
    return [
      c.fecha,
      c.paciente ? `${c.paciente.apellido}, ${c.paciente.nombre}` : "",
      c.tipo,
      ETIQUETA_MEDIO[c.medio],
      Number(c.monto).toFixed(2),
      desglose,
      c.obra_social ?? "",
      c.concepto ?? "",
    ].map(celdaCSV).join(";");
  });

  const contenido = `\uFEFF${[encabezado.map(celdaCSV).join(";"), ...filas].join("\r\n")}\r\n`;
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cobros-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
