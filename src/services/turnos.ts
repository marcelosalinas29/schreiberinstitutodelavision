import { supabase } from "@/integrations/supabase/client";
import type { TurnoConPaciente, TurnoEstado, TurnoInsert, TurnoUpdate } from "@/types/domain";

const SELECT = "*, paciente:pacientes(id, nombre, apellido, dni, obra_social, telefono)";

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

export async function crearEventoPersonal(
  fecha: string,
  hora: string,
  duracionMin: number,
  titulo: string,
): Promise<TurnoConPaciente> {
  return createTurno({
    paciente_id: null,
    tipo: "evento_personal",
    inicio: new Date(`${fecha}T${hora}`).toISOString(),
    duracion_min: duracionMin,
    motivo: titulo,
  } as TurnoInsert);
}

export async function crearBloqueo(
  fecha: string,
  horaInicio: string,
  horaFin: string,
  motivo?: string,
): Promise<TurnoConPaciente> {
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFin.split(":").map(Number);
  const minutos = (hf! * 60 + (mf ?? 0)) - (hi! * 60 + (mi ?? 0));
  if (minutos <= 0) throw new Error("La hora de fin debe ser posterior a la de inicio");
  return createTurno({
    paciente_id: null,
    tipo: "bloqueo",
    inicio: new Date(`${fecha}T${horaInicio}`).toISOString(),
    duracion_min: minutos,
    motivo: motivo?.trim() || "Bloqueado",
  } as TurnoInsert);
}
