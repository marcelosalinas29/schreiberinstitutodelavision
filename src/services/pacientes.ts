import { supabase } from "@/integrations/supabase/client";
import type { Paciente, PacienteInsert, PacienteUpdate } from "@/types/domain";

export async function listPacientes(search = ""): Promise<Paciente[]> {
  let query = supabase.from("pacientes").select("*").order("apellido", { ascending: true }).limit(200);

  const term = search.trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(`nombre.ilike.${like},apellido.ilike.${like},dni.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPaciente(id: string): Promise<Paciente | null> {
  const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function buscarPacientePorDni(dni: string): Promise<Paciente | null> {
  const term = dni.trim();
  if (!term) return null;
  const { data, error } = await supabase.from("pacientes").select("*").ilike("dni", term).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}


export async function createPaciente(values: PacienteInsert): Promise<Paciente> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...values, created_by: auth.user?.id ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updatePaciente(id: string, values: PacienteUpdate): Promise<Paciente> {
  const { data, error } = await supabase.from("pacientes").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deletePaciente(id: string): Promise<void> {
  const { error } = await supabase.from("pacientes").delete().eq("id", id);
  if (error) throw error;
}
