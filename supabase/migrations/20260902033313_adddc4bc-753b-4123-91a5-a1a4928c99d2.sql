DROP POLICY IF EXISTS "hc_medico_all" ON public.historias_clinicas;

CREATE POLICY "hc_select_staff" ON public.historias_clinicas
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "hc_insert_medico" ON public.historias_clinicas
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'medico'));

CREATE POLICY "hc_update_medico" ON public.historias_clinicas
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'medico'))
  WITH CHECK (public.has_role(auth.uid(), 'medico'));

CREATE POLICY "hc_delete_medico" ON public.historias_clinicas
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'medico'));