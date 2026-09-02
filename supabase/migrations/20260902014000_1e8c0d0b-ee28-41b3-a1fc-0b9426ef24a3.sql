ALTER TABLE public.practicas_estudios ADD COLUMN IF NOT EXISTS categoria text;

UPDATE public.practicas_estudios
SET categoria = 'Cirugías'
WHERE codigo IN ('02.03.01', '02.03.02', '02.03.05', '02.07.01', '02.02.02', '02.02.04', '02.02.05', '02.08.03', '30.01.18')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);