ALTER TABLE public.documentos_clinicos DROP CONSTRAINT documentos_clinicos_tipo_check;
ALTER TABLE public.documentos_clinicos ADD CONSTRAINT documentos_clinicos_tipo_check CHECK (tipo IN ('consentimiento','protocolo_quirurgico','tratamiento_preoperatorio'));

INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT 'tratamiento_preoperatorio', 'Tratamiento preoperatorio - Cirugía de catarata',
'TRATAMIENTO PREOPERATORIO - CIRUGÍA DE CATARATA

Indicaciones a cumplir antes de la cirugía:

1. Colirio antibiótico: instilar 1 gota en el ojo a operar cada 8 horas, comenzando 3 días antes de la fecha quirúrgica.
2. Colirio antiinflamatorio no esteroideo: instilar 1 gota en el ojo a operar cada 12 horas, comenzando 1 día antes de la fecha quirúrgica (según indicación del profesional).
3. Suspensión de lentes de contacto: retirar el uso al menos 3 días antes de la cirugía (o el plazo que indique el profesional según el tipo de lente).
4. Medicación anticoagulante/antiagregante: NO suspender por cuenta propia. Consultar con el médico tratante y con el especialista de cabecera sobre la conducta a seguir.
5. Ayuno: cumplir con el ayuno indicado por el servicio de anestesia (habitualmente 6 a 8 horas para sólidos), si la cirugía se realiza con sedación.
6. Higiene: concurrir el día de la cirugía con el rostro limpio, sin maquillaje ni cremas.
7. Concurrir acompañado/a, ya que no podrá conducir al finalizar el procedimiento.
8. Traer los estudios prequirúrgicos y el consentimiento informado firmado.

Ante fiebre, conjuntivitis, orzuelo u otra afección ocular o general en los días previos, comunicarse con el consultorio antes de la fecha programada.

Paciente: [NOMBRE_PACIENTE]  Fecha de cirugía: [FECHA]
Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]',
u.id
FROM auth.users u
WHERE u.email = 'marilischreiber@yahoo.com.ar'
  AND NOT EXISTS (
    SELECT 1 FROM public.documentos_clinicos d
    WHERE d.nombre = 'Tratamiento preoperatorio - Cirugía de catarata'
  );

INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT 'tratamiento_preoperatorio', 'Tratamiento preoperatorio - Cirugía oftalmológica general',
'TRATAMIENTO PREOPERATORIO - CIRUGÍA OFTALMOLÓGICA GENERAL

Indicaciones a cumplir antes de la cirugía:

1. Colirio antibiótico profiláctico según indicación del profesional, comenzando los días previos que se le indiquen.
2. Suspensión de lentes de contacto, si corresponde, con la anticipación indicada.
3. Medicación anticoagulante/antiagregante: NO suspender por cuenta propia; consultar con el médico tratante.
4. Ayuno según indicación del servicio de anestesia, si aplica.
5. Concurrir con los estudios prequirúrgicos y el consentimiento informado firmado.
6. Concurrir acompañado/a.

Ante cualquier afección ocular o general en los días previos a la cirugía, comunicarse con el consultorio.

Paciente: [NOMBRE_PACIENTE]  Fecha de cirugía: [FECHA]
Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]',
u.id
FROM auth.users u
WHERE u.email = 'marilischreiber@yahoo.com.ar'
  AND NOT EXISTS (
    SELECT 1 FROM public.documentos_clinicos d
    WHERE d.nombre = 'Tratamiento preoperatorio - Cirugía oftalmológica general'
  );