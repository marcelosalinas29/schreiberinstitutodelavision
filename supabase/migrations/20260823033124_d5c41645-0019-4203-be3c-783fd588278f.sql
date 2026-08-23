CREATE TABLE public.documentos_clinicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('consentimiento','protocolo_quirurgico')),
  nombre text NOT NULL,
  contenido text NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_clinicos TO authenticated;
GRANT ALL ON public.documentos_clinicos TO service_role;

ALTER TABLE public.documentos_clinicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY documentos_select_staff ON public.documentos_clinicos
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY documentos_write_medico ON public.documentos_clinicos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'medico'::public.app_role) AND owner_id = auth.uid());

CREATE INDEX idx_documentos_clinicos_tipo ON public.documentos_clinicos (tipo, nombre);

CREATE TRIGGER trg_documentos_clinicos_updated BEFORE UPDATE ON public.documentos_clinicos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT v.tipo, v.nombre, v.contenido, u.id
FROM (VALUES
('consentimiento', 'Consentimiento informado - Procedimiento oftalmológico general', 'CONSENTIMIENTO INFORMADO

En cumplimiento de la Ley 26.529 de Derechos del Paciente y el artículo 59 del Código Civil y Comercial de la Nación, dejo constancia de que el/la profesional actuante me ha explicado, en lenguaje claro y comprensible, la naturaleza del procedimiento/estudio propuesto, sus objetivos, los beneficios esperados, los riesgos y molestias posibles (incluyendo los infrecuentes pero graves), las alternativas diagnósticas o terapéuticas disponibles, y las consecuencias previsibles de no realizarlo.

He podido formular las preguntas que consideré necesarias y las mismas fueron respondidas satisfactoriamente. Comprendo que ningún procedimiento médico está exento de riesgos y que no se me ha garantizado un resultado determinado.

Declaro que presto mi consentimiento en forma libre, voluntaria e informada para la realización del procedimiento descripto, entendiendo que puedo revocar esta autorización en cualquier momento antes de su realización, sin que ello genere consecuencia negativa alguna sobre mi atención posterior.

Paciente: [NOMBRE_PACIENTE]  DNI: [DNI_PACIENTE]  Fecha: [FECHA]

Procedimiento propuesto: ___________________________________________

Firma del paciente (o representante legal): _________________________

Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]'),
('consentimiento', 'Consentimiento informado - Cirugía de catarata', 'CONSENTIMIENTO INFORMADO PARA CIRUGÍA DE CATARATA

Diagnóstico: catarata en el/los ojo/s indicado/s, que produce disminución progresiva de la visión.

Procedimiento propuesto: facoemulsificación con implante de lente intraocular (LIO), bajo anestesia local (tópica o peribulbar) y sedación según corresponda.

Beneficios esperados: mejoría de la agudeza visual afectada por la catarata.

Riesgos y complicaciones posibles (frecuentes e infrecuentes): infección intraocular (endoftalmitis), sangrado, edema corneal, desprendimiento de retina, aumento de la presión intraocular, ruptura de la cápsula posterior con eventual necesidad de cirugía adicional o cambio de técnica, luxación del lente intraocular, necesidad de reintervención, persistencia de defecto refractivo residual que requiera uso de anteojos, y en casos excepcionales pérdida de la visión del ojo operado.

Alternativas: uso de corrección óptica (anteojos) mientras sea posible, o diferir la cirugía, entendiendo que la catarata no tratada progresa y puede complicar una cirugía futura.

Cuidados postoperatorios: uso de la medicación indicada, controles periódicos según indicación médica, y consulta inmediata ante dolor intenso, disminución brusca de la visión o secreción purulenta.

Declaro haber comprendido lo explicado, haber podido preguntar y haber recibido respuesta a mis dudas, y presto mi consentimiento libre e informado para la realización de la cirugía descripta en el ojo: ( ) Derecho ( ) Izquierdo ( ) Ambos.

Paciente: [NOMBRE_PACIENTE]  DNI: [DNI_PACIENTE]  Fecha: [FECHA]

Firma del paciente (o representante legal): _________________________

Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]'),
('consentimiento', 'Consentimiento informado - Inyección intravítrea', 'CONSENTIMIENTO INFORMADO PARA APLICACIÓN DE INYECCIÓN INTRAVÍTREA

Diagnóstico y fundamento del tratamiento: ___________________________

Procedimiento propuesto: aplicación de medicación por vía intravítrea bajo anestesia tópica y condiciones de asepsia quirúrgica, medicación a utilizar: ___________________________

Beneficios esperados: estabilización o mejoría de la condición retiniana que motiva el tratamiento, según el diagnóstico indicado.

Riesgos y complicaciones posibles: endoftalmitis (infección intraocular grave), hemorragia vítrea, desprendimiento de retina, aumento de la presión intraocular, catarata, y en casos excepcionales pérdida visual severa. Puede requerirse más de una aplicación según evolución.

Alternativas: otros esquemas terapéuticos disponibles según el diagnóstico, o la abstención terapéutica, con el riesgo de progresión de la enfermedad de base.

Declaro haber comprendido lo explicado, haber podido preguntar y presto mi consentimiento libre e informado para la aplicación descripta en el ojo: ( ) Derecho ( ) Izquierdo.

Paciente: [NOMBRE_PACIENTE]  DNI: [DNI_PACIENTE]  Fecha: [FECHA]

Firma del paciente (o representante legal): _________________________

Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]'),
('protocolo_quirurgico', 'Protocolo quirúrgico - Cirugía de catarata', 'PROTOCOLO QUIRÚRGICO - FACOEMULSIFICACIÓN CON IMPLANTE DE LIO

Paciente: [NOMBRE_PACIENTE]   Fecha de cirugía: [FECHA]   Ojo: ( ) OD ( ) OI

PREOPERATORIO:
- Verificar consentimiento informado firmado
- Biometría y cálculo de LIO confirmados (poder dióptrico: _______)
- Ayuno según indicación anestésica si corresponde
- Verificar antecedentes de alergias y medicación anticoagulante/antiagregante
- Dilatación pupilar según protocolo del quirófano
- Marcado del ojo a operar

INTRAOPERATORIO:
- Anestesia: ( ) Tópica ( ) Peribulbar ( ) Otra: _______
- Técnica: facoemulsificación estándar
- Lente intraocular a implantar: modelo _______ poder _______
- Incidencias/observaciones: ___________________________

POSTOPERATORIO INMEDIATO:
- Colocación de protector ocular
- Indicaciones de medicación postoperatoria (antibiótico + antiinflamatorio según esquema habitual del profesional)
- Turno de control a las 24-48 hs
- Pautas de alarma entregadas al paciente (dolor intenso, disminución de visión, secreción)

Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]')
) AS v(tipo, nombre, contenido)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;