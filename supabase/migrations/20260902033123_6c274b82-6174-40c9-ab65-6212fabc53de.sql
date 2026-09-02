DELETE FROM public.formatos_historia
WHERE nombre = 'Complementarios Vasculitis/Uveítis'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);