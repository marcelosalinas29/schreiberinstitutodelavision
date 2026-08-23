import { supabase } from "@/integrations/supabase/client";
import type { Medicamento, MedicamentoInsert } from "@/types/domain";

export async function listMedicamentos(busqueda = ""): Promise<Medicamento[]> {
  let query = supabase.from("medicamentos").select("*").order("nombre", { ascending: true });
  const q = busqueda.trim();
  if (q) query = query.ilike("nombre", `%${q}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function upsertMedicamento(
  values: Omit<MedicamentoInsert, "owner_id"> & { id?: string },
): Promise<Medicamento> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("medicamentos")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("medicamentos")
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMedicamento(id: string): Promise<void> {
  const { error } = await supabase.from("medicamentos").delete().eq("id", id);
  if (error) throw error;
}

/** Línea de tratamiento lista para la receta. */
export function lineaTratamiento(m: Medicamento): string {
  const dosis = m.dosis?.trim() ? ` ${m.dosis.trim()}` : "";
  return `${m.nombre}${dosis} — ${m.posologia}`;
}
