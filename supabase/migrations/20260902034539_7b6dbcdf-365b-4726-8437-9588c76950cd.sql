DELETE FROM public.practicas_estudios
WHERE seccion = 'Estudios y Prácticas'
  AND coalesce(nullif(btrim(obra_social), ''), '') = ''
  AND coalesce(nullif(btrim(categoria), ''), '') = '';