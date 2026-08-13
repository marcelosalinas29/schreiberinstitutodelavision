import { supabase } from "@/integrations/supabase/client";
import type { HistoriaClinica, HistoriaClinicaInsert } from "@/types/domain";

export async function listHistoriasPaciente(pacienteId: string): Promise<HistoriaClinica[]> {
  const { data, error } = await supabase
    .from("historias_clinicas")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listHistoriasRecientes(limit = 25): Promise<HistoriaClinica[]> {
  const { data, error } = await supabase
    .from("historias_clinicas")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getHistoria(id: string): Promise<HistoriaClinica | null> {
  const { data, error } = await supabase.from("historias_clinicas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createHistoria(values: HistoriaClinicaInsert): Promise<HistoriaClinica> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("historias_clinicas")
    .insert({ ...values, autor_id: auth.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateHistoria(id: string, values: Partial<HistoriaClinicaInsert>): Promise<HistoriaClinica> {
  const { data, error } = await supabase.from("historias_clinicas").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}
