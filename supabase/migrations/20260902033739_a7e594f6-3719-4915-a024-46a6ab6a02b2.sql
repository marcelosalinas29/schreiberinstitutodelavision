CREATE TABLE public.pacientes_investigacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  diagnostico text,
  notas text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes_investigacion TO authenticated;
GRANT ALL ON public.pacientes_investigacion TO service_role;

ALTER TABLE public.pacientes_investigacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inv_all_medico" ON public.pacientes_investigacion
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'medico'))
  WITH CHECK (public.has_role(auth.uid(), 'medico'));

CREATE INDEX idx_pacientes_investigacion_paciente ON public.pacientes_investigacion (paciente_id);

CREATE TRIGGER trg_pacientes_investigacion_updated
  BEFORE UPDATE ON public.pacientes_investigacion
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();