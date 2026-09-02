DELETE FROM public.practicas_estudios
WHERE (nombre ILIKE '%Marcelo Salinas%' OR nombre ILIKE '%IAPOS%')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET orden = v.orden
FROM (VALUES ('30.01.20', 1), ('30.01.04', 2), ('30.01.09', 3), ('30.01.08', 4)) AS v(codigo, orden)
WHERE public.practicas_estudios.codigo = v.codigo AND public.practicas_estudios.obra_social = 'Avalian'
  AND public.practicas_estudios.owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET orden = v.orden
FROM (VALUES ('30.01.22', 1), ('30.01.20', 2), ('30.01.19', 3), ('30.02.93', 4)) AS v(codigo, orden)
WHERE public.practicas_estudios.codigo = v.codigo AND public.practicas_estudios.obra_social = 'Prevención'
  AND public.practicas_estudios.owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET orden = v.orden
FROM (VALUES ('30.01.20', 1), ('30.01.19', 2), ('30.01.09', 3), ('30.01.08', 4), ('30.01.37', 5)) AS v(codigo, orden)
WHERE public.practicas_estudios.codigo = v.codigo AND public.practicas_estudios.obra_social = 'AMUR'
  AND public.practicas_estudios.owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET orden = v.orden
FROM (VALUES
  ('02.03.01', 1), ('02.03.02', 2), ('02.03.05', 3), ('02.07.01', 4),
  ('02.02.02', 5), ('02.02.04', 6), ('02.02.05', 7), ('02.08.03', 8), ('30.01.18', 9)
) AS v(codigo, orden)
WHERE public.practicas_estudios.codigo = v.codigo AND public.practicas_estudios.categoria = 'Cirugías'
  AND public.practicas_estudios.owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);