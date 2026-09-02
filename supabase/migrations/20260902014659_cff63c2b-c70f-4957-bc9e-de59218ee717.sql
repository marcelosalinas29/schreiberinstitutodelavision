CREATE TABLE public.caja_pendientes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  tipo text not null check (tipo in ('dinero', 'autorizacion')),
  concepto text not null,
  monto numeric,
  resuelto boolean not null default false,
  resuelto_at timestamptz,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caja_pendientes TO authenticated;
GRANT ALL ON public.caja_pendientes TO service_role;

ALTER TABLE public.caja_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY caja_pendientes_staff_all ON public.caja_pendientes
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_caja_pendientes_updated
  BEFORE UPDATE ON public.caja_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_caja_pendientes_resuelto ON public.caja_pendientes (resuelto);