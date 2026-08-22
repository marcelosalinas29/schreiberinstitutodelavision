CREATE TABLE public.practicas_estudios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_social text,
  nombre text NOT NULL,
  codigo text,
  contenido text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practicas_estudios TO authenticated;
GRANT ALL ON public.practicas_estudios TO service_role;

ALTER TABLE public.practicas_estudios ENABLE ROW LEVEL SECURITY;

CREATE POLICY practicas_select_staff ON public.practicas_estudios
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY practicas_write_medico ON public.practicas_estudios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_practicas_updated BEFORE UPDATE ON public.practicas_estudios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();