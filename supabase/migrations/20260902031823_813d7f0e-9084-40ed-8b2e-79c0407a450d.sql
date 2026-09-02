ALTER TABLE public.practicas_estudios ADD COLUMN IF NOT EXISTS orden integer;

UPDATE public.practicas_estudios SET orden = v.orden
FROM (VALUES
('Hemograma Completo', 1), ('VSG', 2), ('Coagulograma', 3),
('Glucemia', 1), ('Uremia', 2), ('Uricemia', 3), ('Creatinina con IFGe', 4), ('Hepatograma', 5), ('Colesterol Total', 6), ('Colesterol HDL', 7), ('Colesterol LDL', 8), ('Triglicéridos', 9), ('Calcemia', 10), ('Ferremia', 11), ('CPK', 12), ('Aldolasa', 13), ('Ácido Láctico', 14), ('Ionograma', 15), ('Amilasa', 16),
('TSH', 1), ('T4 libre', 2), ('aTPO', 3), ('TRABs II', 4), ('anti Tiroglobulina (us)', 5), ('HBA1C', 6), ('Insulinemia', 7), ('Vitamina B12', 8), ('Ácido Fólico', 9), ('Ac. anti Factor Intrínseco (F1)', 10),
('Orina Completa', 1), ('Urocultivo', 2), ('Proteinuria 24hs', 3), ('Creatininuria', 4), ('Clearance de Creatinina', 5), ('Calciuria', 6),
('HIV', 1), ('VDRL', 2), ('FTA-Abs', 3), ('HBsAg', 4), ('HCV', 5), ('Toxoplasmosis-IgG', 6), ('Toxoplasmosis-IgM', 7), ('Toxocara-IgG', 8), ('Toxocara-IgM', 9), ('Chagas (Serología)', 10),
('PCR', 1), ('ASTO', 2), ('Factor Reumatoideo', 3), ('FAN', 4), ('ACRA', 5), ('Anti Músculo liso (ASMA)', 6), ('anti Transglutaminasa-IgA', 7), ('IgA Total', 12), ('IgE Total', 13), ('ECA', 14), ('ANCA (Y y C)', 15), ('Anticardiolipina IgG-IgM', 16), ('Anticoagulante lúpico', 17), ('B2 Glicoproteína', 18),
('HLA B27', 1), ('HLA B29', 2), ('HLA B51', 3)
) AS v(nombre, orden)
WHERE public.practicas_estudios.nombre = v.nombre
  AND public.practicas_estudios.seccion = 'Laboratorio'
  AND public.practicas_estudios.owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

INSERT INTO public.practicas_estudios (seccion, categoria, nombre, codigo, contenido, orden, owner_id)
SELECT 'Laboratorio', v.categoria, v.nombre, NULL, 'Solicito ' || v.nombre || '.', v.orden, u.id
FROM (VALUES
('Química Sanguínea', 'PSA', 17),
('Inmunología', 'IgG Antigliadina', 8),
('Inmunología', 'IgA Antigliadina', 9),
('Inmunología', 'IgG Antiendomisio', 10),
('Inmunología', 'IgA Antiendomisio', 11),
('Vitaminas', 'Vitamina D', 1),
('Vitaminas', 'Vitamina A', 2),
('Vitaminas', 'Vitamina B2-B6-B9-B12', 3)
) AS v(categoria, nombre, orden)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;

INSERT INTO public.formatos_historia (nombre, contenido, owner_id)
SELECT 'Complementarios Vasculitis/Uveítis',
'Solicito: Hemograma completo, Glucemia, VSG, PCR, Coagulograma, HIV, VDRL, Toxoplasmosis IgM e IgG, FAN, FR, C3 y C4 (complemento), HLA B27, IgE Total, ECA, ANCA C y P, Anticardiolipina IgG e IgM, Anticoagulante lúpico, B2 Glicoproteína, TSH, T4 libre, aTPO, TRABs II, Antitiroglobulina.',
u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;