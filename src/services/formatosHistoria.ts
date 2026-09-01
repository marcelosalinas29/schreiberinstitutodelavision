import { supabase } from "@/integrations/supabase/client";
import type { FormatoHistoria, FormatoHistoriaInsert } from "@/types/domain";

export async function listFormatosHistoria(): Promise<FormatoHistoria[]> {
  const { data, error } = await supabase
    .from("formatos_historia")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertFormatoHistoria(
  values: Omit<FormatoHistoriaInsert, "owner_id"> & { id?: string },
): Promise<FormatoHistoria> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("formatos_historia")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("formatos_historia")
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFormatoHistoria(id: string): Promise<void> {
  const { error } = await supabase.from("formatos_historia").delete().eq("id", id);
  if (error) throw error;
}
