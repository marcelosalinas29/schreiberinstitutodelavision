import { supabase } from "@/integrations/supabase/client";
import type { Cie10Entry, Cie10EntryInsert } from "@/types/domain";

export async function listCie10(): Promise<Cie10Entry[]> {
  const { data, error } = await supabase
    .from("cie10_diccionario")
    .select("*")
    .order("palabra_clave", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertCie10(
  values: Omit<Cie10EntryInsert, "owner_id"> & { id?: string },
): Promise<Cie10Entry> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("cie10_diccionario")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { id: _omit, ...campos } = values;
  const { data, error } = await supabase
    .from("cie10_diccionario")
    .insert({
      palabra_clave: campos.palabra_clave,
      codigo: campos.codigo,
      descripcion: campos.descripcion,
      owner_id: ownerId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCie10(id: string): Promise<void> {
  const { error } = await supabase.from("cie10_diccionario").delete().eq("id", id);
  if (error) throw error;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Busca la entrada del diccionario cuya palabra clave aparezca en el diagnóstico (la más específica gana). */
export function buscarCie10(diagnostico: string, diccionario: Cie10Entry[]): Cie10Entry | null {
  const texto = normalizar(diagnostico);
  if (!texto) return null;

  let mejor: Cie10Entry | null = null;
  let largo = 0;
  for (const entrada of diccionario) {
    const clave = normalizar(entrada.palabra_clave);
    if (clave && texto.includes(clave) && clave.length > largo) {
      mejor = entrada;
      largo = clave.length;
    }
  }
  return mejor;
}
