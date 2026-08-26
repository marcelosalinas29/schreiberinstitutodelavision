import { supabase } from "@/integrations/supabase/client";
import type { LinkObraSocial, LinkObraSocialInsert } from "@/types/domain";

export async function listLinksObrasSociales(): Promise<LinkObraSocial[]> {
  const { data, error } = await supabase
    .from("links_obras_sociales")
    .select("*")
    .order("obra_social", { ascending: true })
    .order("nombre_plataforma", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertLinkObraSocial(
  values: Omit<LinkObraSocialInsert, "owner_id"> & { id?: string },
): Promise<LinkObraSocial> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("links_obras_sociales")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("links_obras_sociales")
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLinkObraSocial(id: string): Promise<void> {
  const { error } = await supabase.from("links_obras_sociales").delete().eq("id", id);
  if (error) throw error;
}
