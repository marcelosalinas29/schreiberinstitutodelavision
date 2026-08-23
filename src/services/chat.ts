import { supabase } from "@/integrations/supabase/client";

export interface MensajeChat {
  id: string;
  autor_id: string;
  contenido: string;
  created_at: string;
}

export interface MensajeChatConAutor extends MensajeChat {
  autor_nombre: string;
}

/** Borra mensajes de más de 28 días (respaldo por si el cron no corre). */
export async function limpiarMensajesViejos(): Promise<void> {
  await supabase.rpc("limpiar_mensajes_chat_viejos");
}

async function mapaAutores(ids: string[]): Promise<Record<string, string>> {
  const unicos = Array.from(new Set(ids));
  if (unicos.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, nombre_completo, email")
    .in("id", unicos);
  const mapa: Record<string, string> = {};
  for (const p of data ?? []) {
    mapa[p.id] = p.nombre_completo || p.email || "Usuario";
  }
  return mapa;
}

export async function listMensajes(limite = 200): Promise<MensajeChatConAutor[]> {
  const { data, error } = await supabase
    .from("mensajes_chat")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw error;
  const filas = ((data ?? []) as MensajeChat[]).slice().reverse();
  const autores = await mapaAutores(filas.map((m) => m.autor_id));
  return filas.map((m) => ({ ...m, autor_nombre: autores[m.autor_id] ?? "Usuario" }));
}

export async function enviarMensaje(contenido: string): Promise<void> {
  const texto = contenido.trim();
  if (!texto) return;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Sesión no válida");
  const { error } = await supabase.from("mensajes_chat").insert({ autor_id: uid, contenido: texto });
  if (error) throw error;
}

export async function borrarMensaje(id: string): Promise<void> {
  const { error } = await supabase.from("mensajes_chat").delete().eq("id", id);
  if (error) throw error;
}

export function suscribirseAMensajes(callback: (mensaje: MensajeChat) => void) {
  const channel = supabase
    .channel("mensajes_chat_realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "mensajes_chat" },
      (payload) => {
        const fila = (payload.new ?? payload.old) as MensajeChat;
        if (fila) callback(fila);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function exportarConversacion(): Promise<void> {
  const mensajes = await listMensajes(1000);
  const lineas = mensajes.map(
    (m) => `[${new Date(m.created_at).toLocaleString("es-AR")}] ${m.autor_nombre}: ${m.contenido}`,
  );
  const contenido = `Conversación interna — Schreiber Instituto de la Visión\nExportado: ${new Date().toLocaleString("es-AR")}\n\n${lineas.join("\n")}\n`;
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chat-interno-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
