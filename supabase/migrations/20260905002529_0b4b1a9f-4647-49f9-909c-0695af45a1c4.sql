DROP POLICY IF EXISTS "hc_insert_medico" ON public.historias_clinicas;

CREATE POLICY "hc_insert_staff"
ON public.historias_clinicas
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));