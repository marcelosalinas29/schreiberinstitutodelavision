ALTER TABLE public.practicas_estudios ADD COLUMN IF NOT EXISTS seccion text;

UPDATE public.practicas_estudios SET seccion = 'Cirugías'
WHERE categoria = 'Cirugías' AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Estudios y Prácticas'
WHERE (obra_social IS NOT NULL OR categoria = 'Glaucoma y otros')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Otros estudios complementarios'
WHERE categoria IN ('ECG', 'RNM', 'Otros estudios complementarios')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Hematología / Coagulación'
WHERE nombre IN ('Hemograma Completo', 'VSG', 'Coagulograma')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Química Sanguínea'
WHERE nombre IN ('Glucemia', 'Uremia', 'Uricemia', 'Creatinina con IFGe', 'Hepatograma', 'Colesterol Total', 'Colesterol HDL', 'Colesterol LDL', 'Triglicéridos', 'Calcemia', 'Ferremia', 'CPK', 'Aldolasa', 'Ácido Láctico', 'Ionograma', 'Amilasa')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Endocrinología'
WHERE nombre IN ('TSH', 'T4 libre', 'aTPO', 'TRABs II', 'anti Tiroglobulina (us)', 'HBA1C', 'Insulinemia', 'Vitamina B12', 'Ácido Fólico', 'Ac. anti Factor Intrínseco (F1)')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Serología'
WHERE nombre IN ('HIV', 'VDRL', 'FTA-Abs', 'HBsAg', 'HCV', 'Toxoplasmosis-IgG', 'Toxoplasmosis-IgM', 'Toxocara-IgG', 'Toxocara-IgM', 'Chagas (Serología)')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Examen de Orina'
WHERE nombre IN ('Orina Completa', 'Urocultivo', 'Proteinuria 24hs', 'Creatininuria', 'Clearance de Creatinina', 'Calciuria')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'Inmunología'
WHERE nombre IN ('PCR', 'ASTO', 'Factor Reumatoideo', 'FAN', 'ACRA', 'Anti Músculo liso (ASMA)', 'anti Transglutaminasa-IgA', 'IgA Total', 'IgE Total', 'ECA', 'ANCA (Y y C)', 'Anticardiolipina IgG-IgM', 'Anticoagulante lúpico', 'B2 Glicoproteína')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio', categoria = 'HLA'
WHERE nombre IN ('HLA B27', 'HLA B29', 'HLA B51')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

UPDATE public.practicas_estudios SET seccion = 'Laboratorio'
WHERE seccion IS NULL AND categoria = 'Laboratorio'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);