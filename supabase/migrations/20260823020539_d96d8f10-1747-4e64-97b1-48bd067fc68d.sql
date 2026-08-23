CREATE TABLE public.medicamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  dosis text,
  posologia text NOT NULL,
  via_administracion text,
  unidades_envase text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicamentos TO authenticated;
GRANT ALL ON public.medicamentos TO service_role;

ALTER TABLE public.medicamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY medicamentos_select_staff ON public.medicamentos
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY medicamentos_write_medico ON public.medicamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid());

CREATE INDEX idx_medicamentos_nombre ON public.medicamentos (nombre);

CREATE TRIGGER trg_medicamentos_updated BEFORE UPDATE ON public.medicamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.medicamentos (nombre, dosis, posologia, via_administracion, unidades_envase, owner_id)
SELECT v.nombre, v.dosis, v.posologia, v.via, v.unidades, u.id
FROM (VALUES
('Hyabak (Hialuronato sódico)', '0.15%', 'Aplicar 1 gota en cada ojo según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Systane Ultra (Polietilenglicol / Propilenglicol)', '0.4% / 0.3%', 'Aplicar 1 o 2 gotas en el ojo afectado según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Humylub (Condroitín sulfato / Hialuronato)', '0.18% / 0.1%', 'Aplicar 1 gota en cada ojo según necesidad.', 'Oftálmica', '1 Frasco (15 ml)'),
('Xalatan (Latanoprost)', '0.005%', 'Aplicar 1 gota en el ojo afectado por la noche.', 'Oftálmica', '1 Frasco (2.5 ml)'),
('Timolol (Timolol maleato)', '0.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Combigan (Brimonidina / Timolol)', '0.2% / 0.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Cosopt (Dorzolamida / Timolol)', '2% / 0.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Tobradex (Tobramicina / Dexametasona)', '0.3% / 0.1%', 'Aplicar 1 gota cada 4 a 6 horas. Agitar bien.', 'Oftálmica', '1 Frasco (5 ml)'),
('Vigamox (Moxifloxacino)', '0.5%', 'Aplicar 1 gota cada 8 horas por 7 días.', 'Oftálmica', '1 Frasco (5 ml)'),
('Prednefrin Forte (Prednisolona acetato)', '1.0%', 'Aplicar 1 gota cada 4 a 6 horas. Agitar bien.', 'Oftálmica', '1 Frasco (5 ml)'),
('Acular (Ketorolaco trometamina)', '0.5%', 'Aplicar 1 gota cada 6 a 8 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Nevanac (Nepafenaco)', '0.1%', 'Aplicar 1 gota cada 8 horas. Agitar bien.', 'Oftálmica', '1 Frasco (5 ml)'),
('Krytantek (Dorzolamida / Timolol / Brimonidina)', '2% / 0.5% / 0.2%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Tropicamida (Tropicamida)', '1.0%', 'Aplicar 1 gota previo a la evaluación diagnóstica.', 'Oftálmica', '1 Frasco (5 ml)'),
('Lipolac (Carbómero)', '0.2%', 'Aplicar una pequeña cantidad en el ojo antes de dormir.', 'Oftálmica', '1 Tubo (10 g)'),
('Recugel (Dexpantenol)', '5%', 'Aplicar 1 gota en el saco conjuntival 4 veces al día.', 'Oftálmica', '1 Tubo (10 g)'),
('Acrylarm Plus (Ácido Poliacrílico / Triglicéridos)', '0.2% / 1%', 'Aplicar 1 gota en cada ojo 3 a 4 veces al día.', 'Oftálmica', '1 Tubo (10 g)'),
('Aucic Plus (Carboximetilcelulosa / Glicerina / Trehalosa)', '0.5% / 0.9% / 3%', 'Aplicar 1 o 2 gotas según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Aucic 1% (Carboximetilcelulosa Sódica)', '1%', 'Aplicar 1 o 2 gotas en los ojos afectados según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Dropstar (Ácido Hialurónico)', '0.4%', 'Aplicar 1 gota 3 a 4 veces al día.', 'Oftálmica', '1 Frasco (10 ml)'),
('Dropstar LC (Ácido Hialurónico sin conservantes)', '0.4%', 'Aplicar 1 gota 3 a 4 veces al día. Libre de conservantes.', 'Oftálmica', '1 Frasco (10 ml)'),
('Lubrol (Hidroxipropilmetilcelulosa)', '0.3%', 'Aplicar 1 gota según necesidad para aliviar la irritación.', 'Oftálmica', '1 Frasco (15 ml)'),
('Cool Tears (Polietilenglicol / Propilenglicol)', '0.4% / 0.3%', 'Aplicar 1 o 2 gotas en el ojo afectado según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Artelac (Hipromelosa)', '0.32%', 'Aplicar 1 gota en el ojo afectado según necesidad.', 'Oftálmica', '1 Frasco (10 ml)'),
('Azitroplos (Azitromicina)', '1%', 'Aplicar 1 gota cada 12 horas por los días indicados.', 'Oftálmica', '1 Frasco (5 ml)'),
('Quidex (Ciprofloxacino / Dexametasona)', '0.3% / 0.1%', 'Aplicar 1 gota cada 4 a 6 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Quidex Ungüento (Ciprofloxacino / Dexametasona)', '0.3% / 0.1%', 'Aplicar una pequeña línea en el ojo antes de dormir.', 'Oftálmica', '1 Tubo (3.5 g)'),
('Decadron con Tobra (Tobramicina / Dexametasona)', '0.3% / 0.1%', 'Aplicar 1 gota cada 4 a 6 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Neagel (Netilmicina)', '0.3%', 'Aplicar 1 gota en el saco conjuntival 4 veces al día.', 'Oftálmica', '1 Tubo (5 g)'),
('Louten (Latanoprost)', '0.005%', 'Aplicar 1 gota en el ojo afectado por la noche.', 'Oftálmica', '1 Frasco (2.5 ml)'),
('Louten T (Latanoprost / Timolol)', '0.005% / 0.5%', 'Aplicar 1 gota en el ojo afectado por la noche.', 'Oftálmica', '1 Frasco (2.5 ml)'),
('Glaucotensil TD (Dorzolamida / Timolol)', '2% / 0.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Xegrex (Dorzolamida / Timolol / Brimonidina)', '2% / 0.5% / 0.2%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Azarga (Brinzolamida / Timolol)', '1% / 0.5%', 'Aplicar 1 gota cada 12 horas. Agitar bien.', 'Oftálmica', '1 Frasco (5 ml)'),
('Brimopress (Brimonidina Tartrato)', '0.2%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Brimopress T (Brimonidina / Timolol)', '0.2% / 0.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Brimopress T LC (Brimonidina / Timolol sin conservantes)', '0.2% / 0.5%', 'Aplicar 1 gota cada 12 horas. Libre de conservantes.', 'Oftálmica', '1 Frasco (5 ml)'),
('Fotorretin (Fenilefrina / Tropicamida)', '5% / 0.5%', 'Aplicar 1 gota previo a la evaluación diagnóstica.', 'Oftálmica', '1 Frasco (5 ml)'),
('Natax (Natamicina)', '5%', 'Aplicar 1 gota cada 1 o 2 horas según evolución.', 'Oftálmica', '1 Frasco (15 ml)'),
('Lidocaina 4% (Lidocaína Clorhidrato)', '4%', 'Uso profesional para anestesia tópica de superficie.', 'Oftálmica', '1 Frasco (5 ml)'),
('Anestalcon (Proparacaína Clorhidrato)', '0.5%', 'Uso profesional. 1 gota previo a procedimientos.', 'Oftálmica', '1 Frasco (15 ml)'),
('Poencaina (Proparacaína Clorhidrato)', '0.5%', 'Uso profesional. Anestésico de acción rápida.', 'Oftálmica', '1 Frasco (15 ml)'),
('Eritrofarm Colirio (Eritromicina)', '1%', 'Aplicar 1 gota cada 6 u 8 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Eritrofarm Ungüento (Eritromicina)', '0.5%', 'Aplicar una pequeña línea en el ojo antes de dormir.', 'Oftálmica', '1 Tubo (3.5 g)'),
('Aceta (Acetazolamida)', '250 mg', 'Tomar 1 comprimido por vía oral según esquema médico.', 'Oral', '30 Comprimidos'),
('Gatidex (Gatifloxacina / Dexametasona)', '0.3% / 0.1%', 'Aplicar 1 gota cada 4 a 6 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('GatifForte (Gatifloxacina)', '0.5%', 'Aplicar 1 gota cada 8 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Gota PC Descongestivo (Nafazolina / Sulfato de Zinc)', '0.05% / 0.02%', 'Aplicar 1 gota 3 a 4 veces al día para el enrojecimiento.', 'Oftálmica', '1 Frasco (15 ml)'),
('Gota PC Plus (Propilenglicol)', '0.6%', 'Aplicar 1 o 2 gotas en el ojo afectado según necesidad.', 'Oftálmica', '1 Frasco (15 ml)'),
('Closporil (Ciclosporina)', '1%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Traler LC (Bepotastina besilato)', '1.5%', 'Aplicar 1 gota cada 12 horas.', 'Oftálmica', '1 Frasco (5 ml)'),
('Lubrol Clean Kit (Aceite de árbol de té / Manzanilla)', 'Solución higiene', 'Utilizar para la higiene diaria de párpados y pestañas.', 'Tópica palpebral', '1 Kit Completo'),
('Lubrol Gel (Carbómero 974P)', '0.25%', 'Aplicar una pequeña cantidad en el ojo antes de dormir.', 'Oftálmica', '1 Tubo (10 g)'),
('Siccafluid (Carbómero 974P)', '0.25%', 'Aplicar 1 gota en el ojo afectado 1 a 4 veces al día.', 'Oftálmica', '30 Monodosis (0.5 g)')
) AS v(nombre, dosis, posologia, via, unidades)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;