ALTER TABLE public.historias_clinicas
  ADD COLUMN IF NOT EXISTS refraccion_cerca_od text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_oi text;