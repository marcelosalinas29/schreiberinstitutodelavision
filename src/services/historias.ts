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

export async function deleteHistoria(id: string): Promise<void> {
  const { error } = await supabase.from("historias_clinicas").delete().eq("id", id);
  if (error) throw error;
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

/* ----------------------------------------------------------------------------
 * Adjuntos libres de estudios (cualquier cantidad, imagen o PDF).
 * -------------------------------------------------------------------------- */

export type HistoriaAdjunto = {
  id: string;
  historia_id: string | null;
  paciente_id?: string | null;
  path: string;
  nombre_archivo: string | null;
  owner_id: string | null;
  created_at: string;
};

/** Sube un archivo de estudio y lo registra como adjunto de la historia. */
export async function subirAdjuntoEstudio(file: File, historiaId: string): Promise<HistoriaAdjunto> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${uid}/historia-${historiaId}-adjunto-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET_MEDICAL).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("historia_adjuntos")
    .insert({ historia_id: historiaId, path, nombre_archivo: file.name, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data as HistoriaAdjunto;
}

export async function listAdjuntosEstudio(historiaId: string): Promise<HistoriaAdjunto[]> {
  const { data, error } = await supabase
    .from("historia_adjuntos")
    .select("*")
    .eq("historia_id", historiaId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HistoriaAdjunto[];
}

export async function eliminarAdjuntoEstudio(id: string): Promise<void> {
  const { error } = await supabase.from("historia_adjuntos").delete().eq("id", id);
  if (error) throw error;
}

/** Sube un estudio que trae el paciente y lo liga a su ficha (sin depender de una consulta). */
export async function subirAdjuntoPaciente(file: File, pacienteId: string): Promise<HistoriaAdjunto> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${uid}/paciente-${pacienteId}-adjunto-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET_MEDICAL).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from("historia_adjuntos")
    .insert({ paciente_id: pacienteId, path, nombre_archivo: file.name, owner_id: uid })
    .select("*")
    .single();
  if (error) throw error;
  return data as HistoriaAdjunto;
}

/** Adjuntos cargados directamente en la ficha del paciente. */
export async function listAdjuntosPaciente(pacienteId: string): Promise<HistoriaAdjunto[]> {
  const { data, error } = await supabase
    .from("historia_adjuntos")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HistoriaAdjunto[];
}

/* ----------------------------------------------------------------------------
 * Detección de historias clínicas completamente vacías (basura del bug viejo).
 * Solo lectura: no borra nada.
 * -------------------------------------------------------------------------- */

export type HistoriaVacia = {
  id: string;
  fecha: string | null;
  created_at: string;
  paciente_id: string;
  paciente_nombre: string;
};

const CAMPOS_VACIO_TEXTO = [
  "examen_ocular_obs",
  "evolucion_clinica",
  "diagnostico",
  "tratamiento",
  "pio_hora",
  "refraccion_od",
  "refraccion_oi",
  "refraccion_cerca_od",
  "refraccion_cerca_oi",
  "campo_visual_obs",
  "fo_od",
  "fo_oi",
  "bmc_od",
  "bmc_oi",
  "arm_od",
  "arm_oi",
  "antecedentes_personales",
  "antecedentes_familiares",
  "antecedentes_oftalmologicos",
  "motivo_consulta",
  "cie10",
  "dictado_crudo",
  "fo_od_imagen_url",
  "fo_oi_imagen_url",
  "cv_od_imagen_url",
  "cv_oi_imagen_url",
] as const;

const CAMPOS_VACIO_NUMERO = [
  "pio_od",
  "pio_oi",
  "curva_pio_ayunas_od",
  "curva_pio_ayunas_oi",
  "curva_pio_sobrecarga_od",
  "curva_pio_sobrecarga_oi",
] as const;

/** Historias sin ningún dato clínico cargado y sin adjuntos asociados. */
export async function listHistoriasVacias(): Promise<HistoriaVacia[]> {
  const { data, error } = await supabase
    .from("historias_clinicas")
    .select("*, pacientes(nombre, apellido)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const filas = (data ?? []) as unknown as (Record<string, unknown> & {
    id: string;
    paciente_id: string;
    fecha: string | null;
    created_at: string;
    pacientes?: { nombre: string | null; apellido: string | null } | null;
  })[];

  const vacias = filas.filter((h) => {
    const textoVacio = CAMPOS_VACIO_TEXTO.every((c) => {
      const v = h[c];
      return v === null || v === undefined || String(v).trim() === "";
    });
    const numeroVacio = CAMPOS_VACIO_NUMERO.every((c) => h[c] === null || h[c] === undefined);
    return textoVacio && numeroVacio;
  });
  if (vacias.length === 0) return [];

  // Excluir las que tengan adjuntos cargados.
  const ids = vacias.map((h) => h.id);
  const { data: adj, error: adjErr } = await supabase
    .from("historia_adjuntos")
    .select("historia_id")
    .in("historia_id", ids);
  if (adjErr) throw adjErr;
  const conAdjunto = new Set((adj ?? []).map((a) => a.historia_id as string));

  return vacias
    .filter((h) => !conAdjunto.has(h.id))
    .map((h) => ({
      id: h.id,
      fecha: h.fecha,
      created_at: h.created_at,
      paciente_id: h.paciente_id,
      paciente_nombre: `${h.pacientes?.apellido ?? ""}, ${h.pacientes?.nombre ?? ""}`.replace(/^, |, $/g, "").trim() || "Sin paciente",
    }));
}
