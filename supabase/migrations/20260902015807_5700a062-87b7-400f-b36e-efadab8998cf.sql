ALTER TABLE public.turnos ALTER COLUMN paciente_id DROP NOT NULL;

ALTER TABLE public.turnos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'turno'
  CHECK (tipo IN ('turno', 'evento_personal', 'bloqueo'));