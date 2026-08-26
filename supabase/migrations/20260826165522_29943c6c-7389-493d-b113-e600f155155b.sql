CREATE TABLE public.cie10_diccionario (
  id uuid primary key default gen_random_uuid(),
  palabra_clave text not null,
  codigo text not null,
  descripcion text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cie10_diccionario TO authenticated;
GRANT ALL ON public.cie10_diccionario TO service_role;

ALTER TABLE public.cie10_diccionario ENABLE ROW LEVEL SECURITY;

CREATE POLICY cie10_select_staff ON public.cie10_diccionario
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY cie10_write_medico ON public.cie10_diccionario
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'medico'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_cie10_updated BEFORE UPDATE ON public.cie10_diccionario
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_cie10_palabra ON public.cie10_diccionario (palabra_clave);

INSERT INTO public.cie10_diccionario (palabra_clave, codigo, descripcion, owner_id)
SELECT v.palabra_clave, v.codigo, v.descripcion, u.id
FROM (VALUES
('catarata', 'H25.9', 'Catarata senil, no especificada'),
('glaucoma', 'H40.9', 'Glaucoma, no especificado'),
('pterigion', 'H11.0', 'Pterigion'),
('conjuntivitis', 'H10.9', 'Conjuntivitis, no especificada'),
('orzuelo', 'H00.0', 'Orzuelo y otras inflamaciones profundas del parpado'),
('chalazion', 'H00.1', 'Chalazion'),
('miopia', 'H52.1', 'Miopia'),
('hipermetropia', 'H52.0', 'Hipermetropia'),
('astigmatismo', 'H52.2', 'Astigmatismo'),
('presbicia', 'H52.4', 'Presbicia'),
('retinopatia diabetica', 'H36.0', 'Retinopatia diabetica'),
('degeneracion macular', 'H35.3', 'Degeneracion macular y de la retina'),
('desprendimiento de retina', 'H33.0', 'Desprendimiento de retina con ruptura retiniana'),
('uveitis', 'H20.9', 'Iridociclitis, no especificada'),
('blefaritis', 'H01.0', 'Blefaritis'),
('ojo seco', 'H04.1', 'Otros trastornos de la glandula lagrimal'),
('ptosis', 'H02.4', 'Ptosis del parpado'),
('estrabismo', 'H50.9', 'Estrabismo, no especificado'),
('ambliopia', 'H53.0', 'Ambliopia por anopsia'),
('queratitis', 'H16.9', 'Queratitis, no especificada'),
('ulcera corneal', 'H16.0', 'Ulcera corneal'),
('oclusion venosa retiniana', 'H34.9', 'Oclusion retiniana vascular, no especificada'),
('edema macular', 'H35.81', 'Edema macular retiniano'),
('hipertension ocular', 'H40.05', 'Hipertension ocular'),
('exoftalmos', 'H05.2', 'Trastornos exoftalmicos')
) AS v(palabra_clave, codigo, descripcion)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;