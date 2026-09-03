ALTER TABLE public.historias_clinicas
  ADD COLUMN IF NOT EXISTS refraccion_od_esf text,
  ADD COLUMN IF NOT EXISTS refraccion_od_cil text,
  ADD COLUMN IF NOT EXISTS refraccion_od_eje text,
  ADD COLUMN IF NOT EXISTS refraccion_oi_esf text,
  ADD COLUMN IF NOT EXISTS refraccion_oi_cil text,
  ADD COLUMN IF NOT EXISTS refraccion_oi_eje text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_od_esf text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_od_cil text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_od_eje text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_oi_esf text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_oi_cil text,
  ADD COLUMN IF NOT EXISTS refraccion_cerca_oi_eje text;