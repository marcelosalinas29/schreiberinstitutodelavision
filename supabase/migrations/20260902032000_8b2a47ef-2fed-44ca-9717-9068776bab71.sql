INSERT INTO public.practicas_estudios (seccion, categoria, nombre, codigo, contenido, orden, owner_id)
SELECT 'Laboratorio', 'Química Sanguínea', v.nombre, NULL, 'Solicito ' || v.nombre || '.', v.orden, u.id
FROM (VALUES
('Magnesio', 18),
('Fósforo', 19)
) AS v(nombre, orden)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;