ALTER TABLE public.medicamentos ADD COLUMN IF NOT EXISTS forma_farmaceutica text;

UPDATE public.medicamentos SET forma_farmaceutica = 'Comprimido' WHERE unidades_envase ILIKE '%Comprimidos%';

UPDATE public.medicamentos SET forma_farmaceutica = 'Ungüento' WHERE nombre ILIKE '%Ungüento%' OR nombre ILIKE '%Neagel%';

UPDATE public.medicamentos SET forma_farmaceutica = 'Gel' WHERE nombre IN ('Lipolac (Carbómero)', 'Recugel (Dexpantenol)', 'Acrylarm Plus (Ácido Poliacrílico / Triglicéridos)') OR nombre ILIKE '%Gel%';

UPDATE public.medicamentos SET forma_farmaceutica = 'Solución de higiene' WHERE nombre ILIKE '%Clean Kit%';

UPDATE public.medicamentos SET forma_farmaceutica = 'Colirio (monodosis)' WHERE unidades_envase ILIKE '%Monodosis%' AND forma_farmaceutica IS NULL;

UPDATE public.medicamentos SET forma_farmaceutica = 'Colirio' WHERE forma_farmaceutica IS NULL AND (unidades_envase ILIKE '%Frasco%' OR via_administracion ILIKE '%Oftálmica%');