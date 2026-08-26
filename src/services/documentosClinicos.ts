import { supabase } from "@/integrations/supabase/client";
import type { DocumentoClinico, DocumentoClinicoInsert, DocumentoTipo } from "@/types/domain";

export async function listDocumentos(): Promise<DocumentoClinico[]> {
  const { data, error } = await supabase
    .from("documentos_clinicos")
    .select("*")
    .order("tipo", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertDocumento(
  values: Omit<DocumentoClinicoInsert, "owner_id"> & { id?: string },
): Promise<DocumentoClinico> {
  const { data: auth } = await supabase.auth.getUser();
  const ownerId = auth.user?.id;
  if (!ownerId) throw new Error("Sesión no válida");

  if (values.id) {
    const { id, ...rest } = values;
    const { data, error } = await supabase
      .from("documentos_clinicos")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("documentos_clinicos")
    .insert({ ...values, owner_id: ownerId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDocumento(id: string): Promise<void> {
  const { error } = await supabase.from("documentos_clinicos").delete().eq("id", id);
  if (error) throw error;
}

export const TIPOS_DOCUMENTO: { value: DocumentoTipo; label: string }[] = [
  { value: "consentimiento", label: "Consentimientos" },
  { value: "protocolo_quirurgico", label: "Protocolos quirúrgicos" },
  { value: "tratamiento_preoperatorio", label: "Tratamientos preoperatorios" },
];

/** Completa los marcadores del documento con los datos del paciente y del profesional. */
export function completarDocumento(
  contenido: string,
  datos: {
    nombrePaciente: string;
    dniPaciente?: string | null;
    matriculaMedico?: string | null;
    fecha: Date;
  },
): string {
  const fecha = datos.fecha.toLocaleDateString("es-AR");
  return contenido
    .replaceAll("[NOMBRE_PACIENTE]", datos.nombrePaciente)
    .replaceAll("[DNI_PACIENTE]", datos.dniPaciente?.trim() || "—")
    .replaceAll("[MATRICULA_MEDICO]", datos.matriculaMedico?.trim() || "__________")
    .replaceAll("[FECHA]", fecha);
}
