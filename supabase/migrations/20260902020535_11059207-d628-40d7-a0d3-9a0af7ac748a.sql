UPDATE public.practicas_estudios
SET categoria = 'Laboratorio', nombre = substring(nombre from 7)
WHERE nombre LIKE 'Lab - %'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios
SET categoria = 'ECG'
WHERE nombre = 'Electrocardiograma y valoración de riesgo prequirúrgico'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

INSERT INTO public.practicas_estudios (obra_social, nombre, codigo, contenido, categoria, owner_id)
SELECT NULL, v.nombre, NULL, 'Solicito ' || v.nombre || '.', v.categoria, u.id
FROM (VALUES
('Resonancia de encéfalo y órbita con cortes axiales y coronales finos, con y sin contraste', 'RNM'),
('AngioRNM', 'RNM'),
('Eco Doppler de vasos del cuello y arteria oftálmica', 'Otros estudios complementarios'),
('Tomografía computada de encéfalo y órbita con y sin contraste, con cortes axiales, coronales y sagitales finos cada 2mm', 'Otros estudios complementarios'),
('AngioTAC', 'Otros estudios complementarios')
) AS v(nombre, categoria)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;