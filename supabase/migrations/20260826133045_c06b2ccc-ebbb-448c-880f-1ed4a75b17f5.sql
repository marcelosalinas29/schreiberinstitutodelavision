ALTER TABLE public.historias_clinicas
  ADD COLUMN IF NOT EXISTS curva_pio_ayunas_od numeric,
  ADD COLUMN IF NOT EXISTS curva_pio_ayunas_oi numeric,
  ADD COLUMN IF NOT EXISTS curva_pio_sobrecarga_od numeric,
  ADD COLUMN IF NOT EXISTS curva_pio_sobrecarga_oi numeric;