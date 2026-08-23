import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/features/auth/useAuth";
import { cn } from "@/lib/utils";
import {
  borrarMensaje,
  enviarMensaje,
  exportarConversacion,
  limpiarMensajesViejos,
  listMensajes,
  suscribirseAMensajes,
  type MensajeChatConAutor,
} from "@/services/chat";

export function ChatWidget() {
  const { user, isMedico } = useCurrentUser();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChatConAutor[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  const recargar = async () => {
    try {
      setMensajes(await listMensajes());
    } catch {
      /* silencioso */
    }
  };

  useEffect(() => {
    if (!abierto || !user) return;
    void limpiarMensajesViejos().catch(() => undefined);
    void recargar();
    const desuscribir = suscribirseAMensajes(() => {
      void recargar();
    });
    return desuscribir;
  }, [abierto, user]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  if (!user) return null;

  const onEnviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await enviarMensaje(texto);
      setTexto("");
      await recargar();
    } catch {
      toast.error("No se pudo enviar el mensaje");
    } finally {
      setEnviando(false);
    }
  };

  const onBorrar = async (id: string) => {
    try {
      await borrarMensaje(id);
      setMensajes((prev) => prev.filter((m) => m.id !== id));
    } catch {
      toast.error("No se pudo borrar el mensaje");
    }
  };

  return (
    <>
      {abierto ? (
        <div className="fixed bottom-20 right-4 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <MessageCircle className="size-4 text-primary" />
            <p className="flex-1 text-sm font-semibold">Chat interno</p>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Exportar conversación"
              onClick={() => {
                void exportarConversacion().catch(() => toast.error("No se pudo exportar"));
              }}
            >
              <Download className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Cerrar chat"
              onClick={() => setAbierto(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="flex flex-col gap-2">
              {mensajes.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No hay mensajes. Los mensajes se borran automáticamente a los 28 días.
                </p>
              ) : null}
              {mensajes.map((m) => {
                const propio = m.autor_id === user.id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "group max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      propio ? "self-end bg-primary/10" : "self-start bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {propio ? "Vos" : m.autor_nombre}
                      </span>
                      <span className="text-[11px] text-muted-foreground/70">
                        {new Date(m.created_at).toLocaleTimeString("es-AR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {propio || isMedico ? (
                        <button
                          type="button"
                          aria-label="Borrar mensaje"
                          className="ml-auto text-muted-foreground/60 transition-colors hover:text-destructive"
                          onClick={() => void onBorrar(m.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                  </div>
                );
              })}
              <div ref={finRef} />
            </div>
          </ScrollArea>

          <form
            className="flex items-center gap-2 border-t border-border p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onEnviar();
            }}
          >
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí un mensaje…"
              aria-label="Mensaje"
            />
            <Button type="submit" size="icon" disabled={enviando || !texto.trim()} aria-label="Enviar">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}

      <Button
        size="icon"
        className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
        aria-label={abierto ? "Cerrar chat interno" : "Abrir chat interno"}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </>
  );
}
