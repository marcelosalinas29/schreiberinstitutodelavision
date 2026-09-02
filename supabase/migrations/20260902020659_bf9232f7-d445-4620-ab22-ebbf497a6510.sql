ALTER TABLE public.documentos_clinicos DROP CONSTRAINT documentos_clinicos_tipo_check;
ALTER TABLE public.documentos_clinicos ADD CONSTRAINT documentos_clinicos_tipo_check
  CHECK (tipo IN ('consentimiento','protocolo_quirurgico','tratamiento_preoperatorio','certificado'));

INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT 'certificado', 'Certificado médico', 'CERTIFICADO MÉDICO

El médico que suscribe certifica haber examinado en el día de la fecha a: [NOMBRE_PACIENTE]

DNI: [DNI_PACIENTE]   Edad: [EDAD_PACIENTE]

Constatando: ......................................................................................................................................................
......................................................................................................................................................

A pedido del interesado, para presentar ante quien corresponda, se extiende el presente certificado.

Fecha: [FECHA]
Firma y sello: ______________  Matrícula: [MATRICULA_MEDICO]', u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
ON CONFLICT DO NOTHING;