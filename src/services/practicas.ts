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
