ALTER TABLE public.historias_clinicas
ADD COLUMN IF NOT EXISTS fo_od_imagen_url text,
ADD COLUMN IF NOT EXISTS fo_oi_imagen_url text,
ADD COLUMN IF NOT EXISTS cv_od_imagen_url text,
ADD COLUMN IF NOT EXISTS cv_oi_imagen_url text;