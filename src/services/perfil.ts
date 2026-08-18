import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/types/domain";

export const BUCKET_MEDICAL = "medical-assets";

export type PerfilUpdate = Partial<
  Pick<
    Profile,
    | "nombre_completo"
    | "especialidad"
    | "matricula"
    | "matricula_nacional"
    | "telefono"
    | "email"
    | "avatar_url"
    | "firma_sello_url"
  >
>;

export async function getMiPerfil(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function actualizarMiPerfil(values: PerfilUpdate): Promise<Profile> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const { data, error } = await supabase.from("profiles").update(values).eq("id", uid).select("*").single();
  if (error) throw error;
  return data;
}

/** Sube una imagen del profesional (foto o firma/sello) y devuelve la ruta guardada. */
export async function subirAssetPerfil(file: File, tipo: "avatar" | "firma"): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${uid}/${tipo}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_MEDICAL).upload(path, file, {
    upsert: true,
    contentType: file.type || "image/png",
  });
  if (error) throw error;
  return path;
}

/** URL temporal firmada para mostrar/descargar un asset privado del bucket. */
export async function urlFirmadaAsset(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET_MEDICAL).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export interface MedicoReceta {
  nombre: string | null;
  especialidad: string | null;
  matricula: string | null;
  matricula_nacional: string | null;
  firmaDataUrl: string | null;
}

async function aDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Datos del médico logueado listos para inyectar en la receta PDF. */
export async function datosMedicoReceta(): Promise<MedicoReceta | null> {
  const perfil = await getMiPerfil();
  if (!perfil) return null;
  const firmaUrl = await urlFirmadaAsset(perfil.firma_sello_url);
  return {
    nombre: perfil.nombre_completo || null,
    especialidad: perfil.especialidad ?? null,
    matricula: perfil.matricula ?? null,
    matricula_nacional: perfil.matricula_nacional ?? null,
    firmaDataUrl: firmaUrl ? await aDataUrl(firmaUrl) : null,
  };
}
