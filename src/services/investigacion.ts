import { supabase } from "@/integrations/supabase/client";

export type PacienteInvestigacion = {
  id: string;
  paciente_id: string;
  diagnostico: string | null;
  notas: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  pacientes: { id: string; nombre: string; apellido: string; dni: string | null } | null;
};

/** Lista de pacientes marcados como casos de interés (solo médica). */
export async function listPacientesInvestigacion(): Promise<PacienteInvestigacion[]> {
  const { data, error } = await supabase
    .from("pacientes_investigacion")
    .select("*, pacientes(id, nombre, apellido, dni)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PacienteInvestigacion[];
}

export async function agregarPacienteInvestigacion(
  pacienteId: string,
  diagnostico?: string,
  notas?: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("pacientes_investigacion").insert({
    paciente_id: pacienteId,
    diagnostico: diagnostico?.trim() || null,
    notas: notas?.trim() || null,
    owner_id: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function eliminarPacienteInvestigacion(id: string): Promise<void> {
  const { error } = await supabase.from("pacientes_investigacion").delete().eq("id", id);
  if (error) throw error;
}
