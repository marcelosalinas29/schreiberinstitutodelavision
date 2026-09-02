import { supabase } from "@/integrations/supabase/client";
import type { PracticaEstudio, PracticaEstudioInsert } from "@/types/domain";

export async function listPracticas(): Promise<PracticaEstudio[]> {
  const { data, error } = await supabase
    .from("practicas_estudios")
    .select("*")
    .order("obra_social", { ascending: true, nullsFirst: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertPractica(
  values: Omit<PracticaEstudioInsert, "owner_id"> & { id?: string },
): Promise<PracticaEstudio> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("practicas_estudios")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("practicas_estudios")
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePractica(id: string): Promise<void> {
  const { error } = await supabase.from("practicas_estudios").delete().eq("id", id);
  if (error) throw error;
}

/** Prácticas que aplican a una obra social; si no hay coincidencias, devuelve las generales. */
export function practicasParaObraSocial(
  practicas: PracticaEstudio[],
  obraSocial?: string | null,
): PracticaEstudio[] {
  const os = (obraSocial ?? "").trim().toLowerCase();
  const especificas = os
    ? practicas.filter((p) => (p.obra_social ?? "").trim().toLowerCase() === os)
    : [];
  const generales = practicas.filter((p) => !p.obra_social || !p.obra_social.trim());
  return especificas.length ? [...especificas, ...generales] : generales;
}

/** Registra que una práctica fue pedida para un paciente (memoria de uso). */
export async function registrarUsoPractica(practicaId: string, pacienteId: string): Promise<void> {
  const { error } = await supabase
    .from("practicas_uso")
    .insert({ practica_id: practicaId, paciente_id: pacienteId });
  if (error) throw error;
}

/** Reordena las prácticas poniendo primero las más pedidas para ese paciente. */
export async function practicasOrdenadasPorUso(
  practicas: PracticaEstudio[],
  pacienteId: string,
): Promise<PracticaEstudio[]> {
  if (!pacienteId || practicas.length === 0) return practicas;
  const { data, error } = await supabase
    .from("practicas_uso")
    .select("practica_id")
    .eq("paciente_id", pacienteId);
  if (error || !data?.length) return practicas;

  const conteo = new Map<string, number>();
  for (const fila of data) conteo.set(fila.practica_id, (conteo.get(fila.practica_id) ?? 0) + 1);

  const usadas = practicas
    .filter((p) => conteo.has(p.id))
    .sort((a, b) => (conteo.get(b.id) ?? 0) - (conteo.get(a.id) ?? 0));
  const resto = practicas.filter((p) => !conteo.has(p.id));
  return [...usadas, ...resto];
}

/** Ids de prácticas que ya se pidieron alguna vez para ese paciente. */
export async function idsPracticasUsadas(pacienteId: string): Promise<string[]> {
  if (!pacienteId) return [];
  const { data, error } = await supabase
    .from("practicas_uso")
    .select("practica_id")
    .eq("paciente_id", pacienteId);
  if (error || !data) return [];
  return [...new Set(data.map((f) => f.practica_id))];
}

/** Encabezado de sección: categoría si la tiene, si no la obra social, si no "General". */
export function grupoDePractica(p: PracticaEstudio): string {
  return p.categoria?.trim() || p.obra_social?.trim() || "General";
}

/** Agrupa preservando el orden recibido (respeta la memoria de uso). */
export function agruparPracticas(practicas: PracticaEstudio[]): [string, PracticaEstudio[]][] {
  const grupos = new Map<string, PracticaEstudio[]>();
  for (const p of practicas) {
    const key = grupoDePractica(p);
    grupos.set(key, [...(grupos.get(key) ?? []), p]);
  }
  return [...grupos.entries()];
}

const ORDEN_SECCIONES = [
  "Estudios y Prácticas",
  "Laboratorio",
  "Otros estudios complementarios",
  "Cirugías",
];

/** Orden fijo de las subcategorías dentro de la sección Laboratorio. */
export const ORDEN_SUBGRUPOS_LABORATORIO = [
  "Hematología / Coagulación",
  "Química Sanguínea",
  "Endocrinología",
  "Examen de Orina",
  "Serología",
  "Inmunología",
  "HLA",
  "Vitaminas",
];

/** Orden fijo de los subgrupos dentro de la sección Estudios y Prácticas. */
export const ORDEN_SUBGRUPOS_ESTUDIOS = ["Avalian", "Prevención", "AMUR", "Glaucoma y otros"];

/** Ordena los ítems por la columna `orden`; los null quedan al final, alfabéticos. */
function ordenarItems(items: PracticaEstudio[]): PracticaEstudio[] {
  return [...items].sort((a, b) => {
    const oa = a.orden ?? Number.MAX_SAFE_INTEGER;
    const ob = b.orden ?? Number.MAX_SAFE_INTEGER;
    if (oa !== ob) return oa - ob;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}



/** Sección de nivel superior; "General" si la fila todavía no tiene una. */
export function seccionDePractica(p: PracticaEstudio): string {
  return p.seccion?.trim() || "General";
}

/** Agrupa en 2 niveles: sección → subdivisión (categoría u obra social), preservando el orden recibido. */
export function agruparPorSeccion(
  practicas: PracticaEstudio[],
): [string, [string, PracticaEstudio[]][]][] {
  const secciones = new Map<string, PracticaEstudio[]>();
  for (const p of practicas) {
    const key = seccionDePractica(p);
    secciones.set(key, [...(secciones.get(key) ?? []), p]);
  }
  return [...secciones.entries()]
    .sort((a, b) => {
      const ia = ORDEN_SECCIONES.indexOf(a[0]);
      const ib = ORDEN_SECCIONES.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([seccion, items]) => {
      const subs = new Map<string, PracticaEstudio[]>();
      for (const p of items) {
        const sub =
          seccion === "Estudios y Prácticas"
            ? p.obra_social?.trim() || p.categoria?.trim() || "General"
            : p.categoria?.trim() || p.obra_social?.trim() || "General";
        subs.set(sub, [...(subs.get(sub) ?? []), p]);
      }
      let entradas = [...subs.entries()];
      if (seccion === "Laboratorio") {
        entradas = entradas.sort((a, b) => {
          const ia = ORDEN_SUBGRUPOS_LABORATORIO.indexOf(a[0]);
          const ib = ORDEN_SUBGRUPOS_LABORATORIO.indexOf(b[0]);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
      }
      if (seccion === "Estudios y Prácticas") {
        entradas = entradas.sort((a, b) => {
          const ia = ORDEN_SUBGRUPOS_ESTUDIOS.indexOf(a[0]);
          const ib = ORDEN_SUBGRUPOS_ESTUDIOS.indexOf(b[0]);
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
      }
      entradas = entradas.map(([sub, lista]) => [sub, ordenarItems(lista)]);
      return [seccion, entradas] as [string, [string, PracticaEstudio[]][]];
    });
}

