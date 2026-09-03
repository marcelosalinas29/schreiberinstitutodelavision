INSERT INTO public.formatos_historia (nombre, contenido, owner_id)
SELECT 'Control 6 meses', 'Actitud visual: fija y sigue con la mirada. Hirschberg normal, alineados. MEO normales. RFM y RFM+ y simétrico.', u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;