CREATE TABLE public.tareas_pendientes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  fecha date,
  completada boolean not null default false,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas_pendientes TO authenticated;
GRANT ALL ON public.tareas_pendientes TO service_role;

ALTER TABLE public.tareas_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff puede ver tareas" ON public.tareas_pendientes
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY "Dueño puede crear tareas" ON public.tareas_pendientes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Dueño puede editar tareas" ON public.tareas_pendientes
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Dueño puede borrar tareas" ON public.tareas_pendientes
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER trg_tareas_pendientes_updated
  BEFORE UPDATE ON public.tareas_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tareas_pendientes_fecha ON public.tareas_pendientes (fecha);