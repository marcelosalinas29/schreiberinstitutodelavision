import { supabase } from "@/integrations/supabase/client";
import type { Plantilla, PlantillaInsert } from "@/types/domain";

export async function listPlantillas(): Promise<Plantilla[]> {
  const { data, error } = await supabase
    .from("plantillas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertPlantilla(values: PlantillaInsert & { id?: string }): Promise<Plantilla> {
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
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlantilla(id: string): Promise<void> {
  const { error } = await supabase.from("plantillas").delete().eq("id", id);
  if (error) throw error;
}
