CREATE TABLE public.mensajes_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.mensajes_chat TO authenticated;
GRANT ALL ON public.mensajes_chat TO service_role;

ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY mensajes_chat_select_staff ON public.mensajes_chat
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY mensajes_chat_insert_own ON public.mensajes_chat
  FOR INSERT TO authenticated WITH CHECK (autor_id = auth.uid());

CREATE POLICY mensajes_chat_delete_own_or_medico ON public.mensajes_chat
  FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR has_role(auth.uid(), 'medico'::app_role));

CREATE INDEX idx_mensajes_chat_created_at ON public.mensajes_chat (created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_chat;

CREATE OR REPLACE FUNCTION public.limpiar_mensajes_chat_viejos()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.mensajes_chat WHERE created_at < now() - interval '28 days';
$$;

REVOKE ALL ON FUNCTION public.limpiar_mensajes_chat_viejos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.limpiar_mensajes_chat_viejos() FROM anon;
GRANT EXECUTE ON FUNCTION public.limpiar_mensajes_chat_viejos() TO authenticated;