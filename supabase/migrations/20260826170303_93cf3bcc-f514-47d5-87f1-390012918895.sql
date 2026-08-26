ALTER TABLE public.cobros ADD COLUMN IF NOT EXISTS comprobante_url text;

CREATE TABLE public.cobros_pagos (
  id uuid primary key default gen_random_uuid(),
  cobro_id uuid not null references public.cobros(id) on delete cascade,
  medio public.medio_pago not null,
  monto numeric not null,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobros_pagos TO authenticated;
GRANT ALL ON public.cobros_pagos TO service_role;

ALTER TABLE public.cobros_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cobros_pagos_staff_all ON public.cobros_pagos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_cobros_pagos_cobro ON public.cobros_pagos (cobro_id);