import { supabase } from "@/integrations/supabase/client";

export type Periodos = { semana: number; mes: number; anio: number };

function inicioDeAnio(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), 0, 1);
}

function inicioDeMes(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

/** Lunes de la semana actual. */
function inicioDeSemana(): Date {
  const n = new Date();
  const dia = (n.getDay() + 6) % 7;
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  d.setDate(d.getDate() - dia);
  return d;
}

function contarPorPeriodo(fechas: (string | null | undefined)[]): Periodos {
  const s = inicioDeSemana().getTime();
  const m = inicioDeMes().getTime();
  const a = inicioDeAnio().getTime();
  let semana = 0;
  let mes = 0;
  let anio = 0;
  for (const f of fechas) {
    if (!f) continue;
    const t = new Date(f.length === 10 ? `${f}T00:00:00` : f).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= a) anio += 1;
    if (t >= m) mes += 1;
    if (t >= s) semana += 1;
  }
  return { semana, mes, anio };
}

export type Estadisticas = {
  cirugias: Periodos;
  camposVisuales: Periodos;
  curvasPio: Periodos;
  cancelados: Periodos;
  ausentes: Periodos;
  atendidos: Periodos;
};

export async function getEstadisticas(): Promise<Estadisticas> {
  const desdeAnio = inicioDeAnio().toISOString();
  const desdeAnioFecha = inicioDeAnio().toISOString().slice(0, 10);

  const [usos, historias, turnos] = await Promise.all([
    supabase
      .from("practicas_uso")
      .select("created_at, practica:practicas_estudios(seccion)")
      .gte("created_at", desdeAnio),
    supabase
      .from("historias_clinicas")
      .select(
        "fecha, campo_visual_obs, cv_od_imagen_url, cv_oi_imagen_url, curva_pio_ayunas_od, curva_pio_ayunas_oi, curva_pio_sobrecarga_od, curva_pio_sobrecarga_oi",
      )
      .gte("fecha", desdeAnioFecha),
    supabase.from("turnos").select("inicio, estado").gte("inicio", desdeAnio),
  ]);

  if (usos.error) throw usos.error;
  if (historias.error) throw historias.error;
  if (turnos.error) throw turnos.error;

  const filasUso = (usos.data ?? []) as unknown as {
    created_at: string;
    practica?: { seccion: string | null } | null;
  }[];
  const cirugias = contarPorPeriodo(
    filasUso.filter((u) => u.practica?.seccion === "Cirugías").map((u) => u.created_at),
  );

  const filasHist = (historias.data ?? []) as unknown as Record<string, unknown>[];
  const tieneTexto = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";
  const camposVisuales = contarPorPeriodo(
    filasHist
      .filter(
        (h) =>
          tieneTexto(h["campo_visual_obs"]) ||
          tieneTexto(h["cv_od_imagen_url"]) ||
          tieneTexto(h["cv_oi_imagen_url"]),
      )
      .map((h) => h["fecha"] as string | null),
  );
  const curvasPio = contarPorPeriodo(
    filasHist
      .filter(
        (h) =>
          h["curva_pio_ayunas_od"] !== null ||
          h["curva_pio_ayunas_oi"] !== null ||
          h["curva_pio_sobrecarga_od"] !== null ||
          h["curva_pio_sobrecarga_oi"] !== null,
      )
      .map((h) => h["fecha"] as string | null),
  );

  const filasTurno = (turnos.data ?? []) as { inicio: string; estado: string }[];
  const porEstado = (estado: string) =>
    contarPorPeriodo(filasTurno.filter((t) => t.estado === estado).map((t) => t.inicio));

  return {
    cirugias,
    camposVisuales,
    curvasPio,
    cancelados: porEstado("cancelado"),
    ausentes: porEstado("ausente"),
    atendidos: porEstado("atendido"),
  };
}
