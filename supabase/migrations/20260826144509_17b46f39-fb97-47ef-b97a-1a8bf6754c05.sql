INSERT INTO public.practicas_estudios (obra_social, nombre, codigo, contenido, owner_id)
SELECT v.obra_social, v.nombre, v.codigo, v.contenido, u.id
FROM (VALUES
(NULL, 'Exoftalmología', '30.01.22', 'Solicito Exoftalmología (cód. 30.01.22).'),
(NULL, 'Oftalmoscopia Binocular Indirecta', '30.01.19', 'Solicito Oftalmoscopia Binocular Indirecta (cód. 30.01.19).'),
(NULL, 'Visuscopia (estudio de fijación en estrabismo)', '30.01.20', 'Solicito Visuscopia, estudio de fijación en estrabismo (cód. 30.01.20).'),
(NULL, 'Fondo de ojos', '30.01.04', 'Solicito Fondo de ojos (cód. 30.01.04).'),
(NULL, 'Gonioscopía', '30.01.08', 'Solicito Gonioscopía (cód. 30.01.08).'),
(NULL, 'Curva tensional', '30.01.09', 'Solicito Curva tensional (cód. 30.01.09).'),
(NULL, 'Campo visual computarizado', '30.02.01', 'Solicito Campo visual computarizado (cód. 30.02.01).'),
(NULL, 'Paquimetría computarizada', '30.02.02', 'Solicito Paquimetría computarizada (cód. 30.02.02).'),
(NULL, 'Biometría ocular', '30.50.01', 'Solicito Biometría ocular (cód. 30.50.01).'),
(NULL, 'OCT - Tomografía ocular de coherencia', '30.50.02', 'Solicito OCT, Tomografía ocular de coherencia (cód. 30.50.02).'),
(NULL, 'Conjuntivoplastia (flapping de conjuntiva)', '02.03.01', 'Solicito autorización para Conjuntivoplastia, flapping de conjuntiva (cód. 02.03.01).'),
(NULL, 'Escisión de lesión conjuntival (quiste, nevus, pterigion)', '02.03.02', 'Solicito autorización para escisión de lesión conjuntival: quiste, nevus o pterigion (cód. 02.03.02).'),
(NULL, 'Sutura de conjuntiva', '02.03.05', 'Solicito autorización para sutura de conjuntiva (cód. 02.03.05).'),
(NULL, 'Cirugía de cataratas', '02.07.01', 'Solicito autorización para cirugía de cataratas (cód. 02.07.01).'),
(NULL, 'Blefaroplastia - corrección de ptosis unilateral', '02.02.02', 'Solicito autorización para blefaroplastia, corrección de ptosis unilateral (cód. 02.02.02).'),
(NULL, 'Blefarochalasis', '02.02.04', 'Solicito autorización para cirugía de blefarochalasis (cód. 02.02.04).'),
(NULL, 'Estudio oftalmológico del RN con fondo de ojo', '30.02.93', 'Solicito Estudio oftalmológico del recién nacido con fondo de ojo (cód. 30.02.93).'),
(NULL, 'Electrocardiograma', NULL, 'Solicito Electrocardiograma.'),
(NULL, 'Laboratorio de rutina', NULL, 'Solicito laboratorio de rutina.'),
(NULL, 'Laboratorio prequirúrgico estándar', NULL, 'Solicito laboratorio prequirúrgico: Hemograma completo, Glucemia, Coagulograma, VSG, Orina completa, HIV y VDRL.')
) AS v(obra_social, nombre, codigo, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;

CREATE TABLE public.practicas_uso (
  id uuid primary key default gen_random_uuid(),
  practica_id uuid not null references public.practicas_estudios(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.practicas_uso TO authenticated;
GRANT ALL ON public.practicas_uso TO service_role;

ALTER TABLE public.practicas_uso ENABLE ROW LEVEL SECURITY;

CREATE POLICY practicas_uso_select_staff ON public.practicas_uso
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE POLICY practicas_uso_insert_staff ON public.practicas_uso
  FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));

CREATE INDEX idx_practicas_uso_paciente ON public.practicas_uso (paciente_id, practica_id);