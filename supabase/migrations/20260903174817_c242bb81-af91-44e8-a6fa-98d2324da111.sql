INSERT INTO public.cie10_diccionario (palabra_clave, codigo, descripcion, owner_id)
SELECT v.palabra_clave, v.codigo, v.descripcion, u.id
FROM (VALUES
  ('ametropia', 'H52.7', 'Trastorno de la refraccion, no especificado'),
  ('dolor ocular', 'H57.1', 'Dolor ocular'),
  ('inflamacion ocular', 'H57.9', 'Trastorno inflamatorio del ojo y sus anexos, no especificado'),
  ('cefaleas', 'R51', 'Cefalea')
) AS v(palabra_clave, codigo, descripcion)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.cie10_diccionario c WHERE lower(c.palabra_clave) = v.palabra_clave
);