import { supabase } from "@/integrations/supabase/client";
import type { HistoriaClinica, HistoriaClinicaInsert } from "@/types/domain";
import { BUCKET_MEDICAL } from "@/services/perfil";

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

/* ----------------------------------------------------------------------------
 * Imágenes adjuntas de la historia clínica (fondo de ojo / campo visual).
 * Reutiliza el bucket privado "medical-assets" ya existente.
 * -------------------------------------------------------------------------- */

export type ImagenHistoriaTipo = "fo_od" | "fo_oi" | "cv_od" | "cv_oi";

const COLUMNA_IMAGEN: Record<ImagenHistoriaTipo, keyof HistoriaClinicaInsert> = {
  fo_od: "fo_od_imagen_url",
  fo_oi: "fo_oi_imagen_url",
  cv_od: "cv_od_imagen_url",
  cv_oi: "cv_oi_imagen_url",
};

/** Sube una imagen/PDF de estudio a la carpeta del usuario y devuelve la ruta guardada. */
export async function subirImagenHistoria(
  file: File,
  historiaId: string,
  tipo: ImagenHistoriaTipo,
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${uid}/historia-${historiaId}-${tipo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_MEDICAL).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });
  if (error) throw error;

  // Si la historia ya existe en base, guardamos la ruta en su columna.
  if (historiaId && historiaId !== "nueva") {
    await updateHistoria(historiaId, { [COLUMNA_IMAGEN[tipo]]: path } as Partial<HistoriaClinicaInsert>);
  }
  return path;
}

/** URL temporal firmada para mostrar un adjunto privado de la historia. */
export async function urlFirmadaImagenHistoria(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET_MEDICAL).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}
