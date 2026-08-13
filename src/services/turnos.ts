import { supabase } from "@/integrations/supabase/client";
import type { TurnoConPaciente, TurnoEstado, TurnoInsert, TurnoUpdate } from "@/types/domain";

const SELECT = "*, paciente:pacientes(id, nombre, apellido, dni, obra_social)";

export async function listTurnosPorRango(desdeISO: string, hastaISO: string): Promise<TurnoConPaciente[]> {
  const { data, error } = await supabase
    .from("turnos")
    .select(SELECT)
    .gte("inicio", desdeISO)
    .lt("inicio", hastaISO)
    .order("inicio", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TurnoConPaciente[];
}

export async function listTurnosPaciente(pacienteId: string): Promise<TurnoConPaciente[]> {
  const { data, error } = await supabase
    .from("turnos")
    .select(SELECT)
    .eq("paciente_id", pacienteId)
    .order("inicio", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as TurnoConPaciente[];
}

export async function createTurno(values: TurnoInsert): Promise<TurnoConPaciente> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("turnos")
    .insert({ ...values, created_by: auth.user?.id ?? null })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data as TurnoConPaciente;
}

export async function updateTurno(id: string, values: TurnoUpdate): Promise<TurnoConPaciente> {
  const { data, error } = await supabase.from("turnos").update(values).eq("id", id).select(SELECT).single();
  if (error) throw error;
  return data as TurnoConPaciente;
}

export async function setEstadoTurno(id: string, estado: TurnoEstado): Promise<void> {
  const { error } = await supabase.from("turnos").update({ estado }).eq("id", id);
  if (error) throw error;
}

export async function deleteTurno(id: string): Promise<void> {
  const { error } = await supabase.from("turnos").delete().eq("id", id);
  if (error) throw error;
}
