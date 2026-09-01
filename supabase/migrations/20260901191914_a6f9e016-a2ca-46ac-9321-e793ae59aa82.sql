ALTER TABLE public.historias_clinicas ADD COLUMN IF NOT EXISTS evolucion_clinica text;

CREATE TABLE public.formatos_historia (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contenido text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formatos_historia TO authenticated;
GRANT ALL ON public.formatos_historia TO service_role;

ALTER TABLE public.formatos_historia ENABLE ROW LEVEL SECURITY;

CREATE POLICY formatos_select_staff ON public.formatos_historia
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY formatos_write_medico ON public.formatos_historia
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_formatos_historia_updated
  BEFORE UPDATE ON public.formatos_historia
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.formatos_historia (nombre, contenido, owner_id)
SELECT v.nombre, v.contenido, u.id
FROM (VALUES
('Control', E'MC: \nAP: \nAF: \nAO: \nBMC: \nFO: '),
('Recién nacido', E'Screening: \nNeonatal: \nOBI: '),
('Niño', E'MC: \nAP: \nAO: \nMEO: \nCover-Uncover: \nColores: \nBMC: \nFO: '),
('PreQx Catarata', E'Ojo a operar: \nDilatación: \nLIO K 118.0: \nObservación: \nDoy indicaciones prequirúrgicas + consentimiento informado.\nPaciente entiende riesgos (7 días antes).'),
('PostQx Catarata', E'Ojo: \nRealizo cirugía de catarata sin complicaciones. LIO en saco. Todo OK.\nIndico: Prednefrin Forte c/2h, Gatidex c/4h, Natax c/8h.\nControl en 24h.')
) AS v(nombre, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;