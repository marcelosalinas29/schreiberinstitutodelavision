-- ROLES
CREATE TYPE public.app_role AS ENUM ('medico', 'secretaria');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL DEFAULT '',
  matricula TEXT,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "profiles_select_staff" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'medico'));

-- TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- NEW USER HANDLER
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'secretaria'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PACIENTES
CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  fecha_nacimiento DATE,
  sexo TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  obra_social TEXT,
  nro_afiliado TEXT,
  notas TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pacientes_staff_all" ON public.pacientes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_pacientes_updated BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_pacientes_apellido ON public.pacientes (apellido);
CREATE INDEX idx_pacientes_dni ON public.pacientes (dni);

-- TURNOS
CREATE TYPE public.turno_estado AS ENUM ('pendiente','en_espera','en_consulta','atendido','cancelado','ausente');

CREATE TABLE public.turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  inicio TIMESTAMPTZ NOT NULL,
  duracion_min INTEGER NOT NULL DEFAULT 20,
  motivo TEXT,
  estado public.turno_estado NOT NULL DEFAULT 'pendiente',
  notas TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turnos TO authenticated;
GRANT ALL ON public.turnos TO service_role;
ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turnos_staff_all" ON public.turnos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_turnos_updated BEFORE UPDATE ON public.turnos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_turnos_inicio ON public.turnos (inicio);

-- HISTORIAS CLINICAS
CREATE TABLE public.historias_clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  motivo_consulta TEXT,
  antecedentes_personales TEXT,
  antecedentes_familiares TEXT,
  antecedentes_oftalmologicos TEXT,
  arm_od TEXT, arm_oi TEXT,
  refraccion_od TEXT, refraccion_oi TEXT,
  av_sc_od TEXT, av_sc_oi TEXT,
  av_cc_od TEXT, av_cc_oi TEXT,
  bmc_od TEXT, bmc_oi TEXT,
  pio_od NUMERIC, pio_oi NUMERIC, pio_hora TEXT,
  fo_od TEXT, fo_oi TEXT,
  diagnostico TEXT,
  cie10 TEXT,
  tratamiento TEXT,
  proxima_cita TEXT,
  dictado_crudo TEXT,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historias_clinicas TO authenticated;
GRANT ALL ON public.historias_clinicas TO service_role;
ALTER TABLE public.historias_clinicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hc_medico_all" ON public.historias_clinicas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'medico')) WITH CHECK (public.has_role(auth.uid(), 'medico'));
CREATE TRIGGER trg_hc_updated BEFORE UPDATE ON public.historias_clinicas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_hc_paciente ON public.historias_clinicas (paciente_id);

-- CAJA
CREATE TYPE public.medio_pago AS ENUM ('efectivo','transferencia','tarjeta','mercado_pago');
CREATE TYPE public.tipo_cobro AS ENUM ('consulta_particular','copago','bono_obra_social','coseguro','practica','otro');

CREATE TABLE public.cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  turno_id UUID REFERENCES public.turnos(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo public.tipo_cobro NOT NULL DEFAULT 'consulta_particular',
  medio public.medio_pago NOT NULL DEFAULT 'efectivo',
  obra_social TEXT,
  concepto TEXT,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobros TO authenticated;
GRANT ALL ON public.cobros TO service_role;
ALTER TABLE public.cobros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cobros_staff_all" ON public.cobros FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_cobros_updated BEFORE UPDATE ON public.cobros FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_cobros_fecha ON public.cobros (fecha);

CREATE TABLE public.cierres_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  turno_label TEXT,
  total_efectivo NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_transferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tarjeta NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_mercado_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_general NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  cerrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cierres_caja TO authenticated;
GRANT DELETE ON public.cierres_caja TO authenticated;
GRANT ALL ON public.cierres_caja TO service_role;
ALTER TABLE public.cierres_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cierres_select_staff" ON public.cierres_caja FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cierres_insert_staff" ON public.cierres_caja FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "cierres_delete_medico" ON public.cierres_caja FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'medico'));

-- PLANTILLAS
CREATE TABLE public.plantillas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Membrete principal',
  institucion TEXT,
  profesional TEXT,
  matricula TEXT,
  direccion TEXT,
  telefono TEXT,
  logo_url TEXT,
  firma_url TEXT,
  pie_pagina TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantillas TO authenticated;
GRANT ALL ON public.plantillas TO service_role;
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plantillas_select_staff" ON public.plantillas FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "plantillas_write_medico" ON public.plantillas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'medico') AND owner_id = auth.uid()) WITH CHECK (public.has_role(auth.uid(), 'medico') AND owner_id = auth.uid());
CREATE TRIGGER trg_plantillas_updated BEFORE UPDATE ON public.plantillas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();