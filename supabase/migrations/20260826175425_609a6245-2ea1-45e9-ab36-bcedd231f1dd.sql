INSERT INTO public.practicas_estudios (obra_social, nombre, codigo, contenido, owner_id)
SELECT v.obra_social, v.nombre, v.codigo, v.contenido, u.id
FROM (VALUES
(NULL, 'Tonometría', '30.01.05', 'Solicito Tonometría (cód. 30.01.05).'),
(NULL, 'Retinografía', '30.01.11', 'Solicito Retinografía (cód. 30.01.11).'),
(NULL, 'Ecografía ocular', '18.01.09', 'Solicito Ecografía ocular (cód. 18.01.09).'),
(NULL, 'Topografía corneal', '30.02.04', 'Solicito Topografía corneal (cód. 30.02.04).'),
(NULL, 'Drenaje de chalazión, orzuelo, absceso, blefarectomía', '02.02.05', 'Solicito autorización para drenaje de chalazión, orzuelo, absceso o blefarectomía (cód. 02.02.05).'),
(NULL, 'Drenaje de glándula o saco lagrimal', '02.08.03', 'Solicito autorización para drenaje de glándula o saco lagrimal (cód. 02.08.03).'),
(NULL, 'Dilatación de vía lagrimal (CLN) con intubación', '30.01.18', 'Solicito autorización para dilatación de vía lagrimal (CLN) con intubación (cód. 30.01.18).')
) AS v(obra_social, nombre, codigo, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;