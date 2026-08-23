import { supabase } from "@/integrations/supabase/client";
import type { Plantilla, PlantillaInsert } from "@/types/domain";

export async function listPlantillas(): Promise<Plantilla[]> {
  const { data, error } = await supabase
    .from("plantillas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  // Cada médico sólo puede editar su propia plantilla (RLS por owner_id),
  // así que priorizamos la del usuario actual.
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return rows;
  return [...rows].sort((a, b) => Number(b.owner_id === uid) - Number(a.owner_id === uid));
}

/** Plantilla propia del usuario actual (la única que puede editar). */
export async function getMiPlantilla(): Promise<Plantilla | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("plantillas")
    .select("*")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertPlantilla(
  values: Omit<PlantillaInsert, "owner_id"> & { id?: string },
): Promise<Plantilla> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase.from("plantillas").update(rest).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("plantillas")
    .insert({ ...values, nombre: values.nombre ?? "Receta estándar", owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlantilla(id: string): Promise<void> {
  const { error } = await supabase.from("plantillas").delete().eq("id", id);
  if (error) throw error;
}
