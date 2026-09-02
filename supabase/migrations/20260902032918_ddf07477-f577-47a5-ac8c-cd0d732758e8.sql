DELETE FROM public.formatos_historia
WHERE nombre IN ('Prequirúrgico - Laboratorio', 'Prequirúrgico - ECG')
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);