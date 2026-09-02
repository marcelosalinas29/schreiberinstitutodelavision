ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS plan_obra_social text,
  ADD COLUMN IF NOT EXISTS condicion_iva text;