ALTER TABLE public.historia_adjuntos ALTER COLUMN historia_id DROP NOT NULL;
ALTER TABLE public.historia_adjuntos ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES public.pacientes(id) ON DELETE CASCADE;
ALTER TABLE public.historia_adjuntos DROP CONSTRAINT IF EXISTS historia_adjuntos_tiene_referencia;
ALTER TABLE public.historia_adjuntos ADD CONSTRAINT historia_adjuntos_tiene_referencia CHECK (paciente_id IS NOT NULL OR historia_id IS NOT NULL);

DROP POLICY IF EXISTS "adj_insert_medico" ON public.historia_adjuntos;
CREATE POLICY "adj_insert_staff" ON public.historia_adjuntos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));