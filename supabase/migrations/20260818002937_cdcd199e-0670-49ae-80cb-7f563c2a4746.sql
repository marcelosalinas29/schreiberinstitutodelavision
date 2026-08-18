ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS especialidad text,
  ADD COLUMN IF NOT EXISTS matricula_nacional text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS firma_sello_url text;