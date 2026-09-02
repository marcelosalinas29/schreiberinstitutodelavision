ALTER TABLE public.practicas_estudios ADD COLUMN IF NOT EXISTS categoria text;

INSERT INTO public.practicas_estudios (obra_social, nombre, codigo, contenido, owner_id)
SELECT v.obra_social, v.nombre, v.codigo, v.contenido, u.id
FROM (VALUES
('Avalian', 'Visuscopía', '30.01.20', 'Solicito Visuscopía (cód. 30.01.20).'),
('Avalian', 'Fondo de ojos / Esquiascopía con dilatación pupilar', '30.01.04', 'Solicito Fondo de ojos / Esquiascopía con dilatación pupilar (cód. 30.01.04).'),
('Avalian', 'Curva tensional', '30.01.09', 'Solicito Curva tensional (cód. 30.01.09).'),
('Avalian', 'Gonioscopía', '30.01.08', 'Solicito Gonioscopía (cód. 30.01.08).'),
('Prevención', 'Exoftalmología', '30.01.22', 'Solicito Exoftalmología (cód. 30.01.22).'),
('Prevención', 'Visuscopía', '30.01.20', 'Solicito Visuscopía (cód. 30.01.20).'),
('Prevención', 'OBI (oftalmoscopía binocular indirecta)', '30.01.19', 'Solicito OBI, oftalmoscopía binocular indirecta (cód. 30.01.19).'),
('Prevención', 'Estudio oftalmológico del recién nacido con fondo de ojos', '30.02.93', 'Solicito Estudio oftalmológico del recién nacido con fondo de ojos (cód. 30.02.93).'),
('AMUR', 'Visuscopía', '30.01.20', 'Solicito Visuscopía (cód. 30.01.20).'),
('AMUR', 'OBI (oftalmoscopía binocular indirecta)', '30.01.19', 'Solicito OBI, oftalmoscopía binocular indirecta (cód. 30.01.19).'),
('AMUR', 'Curva tensional', '30.01.09', 'Solicito Curva tensional (cód. 30.01.09).'),
('AMUR', 'Gonioscopía', '30.01.08', 'Solicito Gonioscopía (cód. 30.01.08).'),
('AMUR', 'Estudio oftalmológico del recién nacido con fondo de ojos', '30.01.37', 'Solicito Estudio oftalmológico del recién nacido con fondo de ojos (cód. 30.01.37).')
) AS v(obra_social, nombre, codigo, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;

UPDATE public.practicas_estudios
SET categoria = 'Glaucoma y otros'
WHERE codigo IN ('30.02.01', '30.02.02', '30.50.01', '30.50.02', '18.01.09', '30.02.04', '30.01.11')
  AND obra_social IS NULL
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);