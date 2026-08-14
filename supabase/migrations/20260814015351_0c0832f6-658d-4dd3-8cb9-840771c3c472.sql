ALTER TABLE public.pacientes
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS consiente_recordatorios boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consiente_recetas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consiente_administrativo boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_dni_unique
  ON public.pacientes (lower(btrim(dni)))
  WHERE dni IS NOT NULL AND btrim(dni) <> '';