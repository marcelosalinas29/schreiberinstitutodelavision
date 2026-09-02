CREATE TABLE public.historia_adjuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id uuid NOT NULL REFERENCES public.historias_clinicas(id) ON DELETE CASCADE,
  path text NOT NULL,
  nombre_archivo text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.historia_adjuntos TO authenticated;
GRANT ALL ON public.historia_adjuntos TO service_role;

ALTER TABLE public.historia_adjuntos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "adj_select_staff" ON public.historia_adjuntos
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "adj_insert_medico" ON public.historia_adjuntos
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'medico'));

CREATE POLICY "adj_delete_medico" ON public.historia_adjuntos
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'medico'));

CREATE INDEX idx_historia_adjuntos_historia ON public.historia_adjuntos (historia_id);