CREATE TABLE public.links_obras_sociales (
  id uuid primary key default gen_random_uuid(),
  obra_social text not null,
  nombre_plataforma text not null,
  url text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links_obras_sociales TO authenticated;
GRANT ALL ON public.links_obras_sociales TO service_role;

ALTER TABLE public.links_obras_sociales ENABLE ROW LEVEL SECURITY;

CREATE POLICY links_os_select_staff ON public.links_obras_sociales
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY links_os_write_medico ON public.links_obras_sociales
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_links_os_updated
  BEFORE UPDATE ON public.links_obras_sociales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.links_obras_sociales (obra_social, nombre_plataforma, url, owner_id)
SELECT 'General', 'Praxys - Prescripción electrónica', 'https://rpe.dsalud.com.ar/recetas/prescripcion', u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;