import { supabase } from "@/integrations/supabase/client";

export interface TareaPendiente {
  id: string;
  texto: string;
  fecha: string | null;
  completada: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTareas(soloPendientes = true): Promise<TareaPendiente[]> {
  let query = supabase.from("tareas_pendientes").select("*");
  if (soloPendientes) query = query.eq("completada", false);
  const { data, error } = await query
    .order("fecha", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TareaPendiente[];
}

export async function crearTarea(texto: string, fecha?: string | null): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("tareas_pendientes").insert({
    texto,
    fecha: fecha || null,
    owner_id: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function marcarTareaCompletada(id: string): Promise<void> {
  const { error } = await supabase.from("tareas_pendientes").update({ completada: true }).eq("id", id);
  if (error) throw error;
}

export async function eliminarTarea(id: string): Promise<void> {
  const { error } = await supabase.from("tareas_pendientes").delete().eq("id", id);
  if (error) throw error;
}
