DROP POLICY IF EXISTS "Staff puede ver tareas" ON public.tareas_pendientes;

CREATE POLICY "Solo médica puede ver tareas" ON public.tareas_pendientes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'medico'));