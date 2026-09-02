DROP POLICY IF EXISTS "cobros_staff_all" ON public.cobros;

CREATE POLICY "cobros_select_medico_o_hoy" ON public.cobros FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'medico') OR fecha = CURRENT_DATE);

CREATE POLICY "cobros_insert_staff" ON public.cobros FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "cobros_update_medico_o_hoy" ON public.cobros FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'medico') OR fecha = CURRENT_DATE) WITH CHECK (public.has_role(auth.uid(), 'medico') OR fecha = CURRENT_DATE);

CREATE POLICY "cobros_delete_medico_o_hoy" ON public.cobros FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'medico') OR fecha = CURRENT_DATE);

DROP POLICY IF EXISTS "cierres_select_staff" ON public.cierres_caja;
DROP POLICY IF EXISTS "cierres_insert_staff" ON public.cierres_caja;

CREATE POLICY "cierres_select_medico" ON public.cierres_caja FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'medico'));

CREATE POLICY "cierres_insert_medico" ON public.cierres_caja FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'medico'));