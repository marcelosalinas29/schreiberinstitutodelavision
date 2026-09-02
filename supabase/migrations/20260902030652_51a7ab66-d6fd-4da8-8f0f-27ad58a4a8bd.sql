INSERT INTO public.formatos_historia (nombre, contenido, owner_id)
SELECT v.nombre, v.contenido, u.id
FROM (VALUES
('Prequirúrgico - Laboratorio', 'Solicito laboratorio prequirúrgico: Hemograma completo, Glucemia, Coagulograma, VSG, Orina completa, HIV y VDRL.'),
('Prequirúrgico - ECG', 'Solicito Electrocardiograma y valoración de riesgo prequirúrgico. DIAG: prequirúrgico cirugía de cataratas.')
) AS v(nombre, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;