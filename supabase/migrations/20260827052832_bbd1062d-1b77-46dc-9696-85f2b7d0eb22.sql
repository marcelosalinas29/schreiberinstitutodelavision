-- 1) Tratamiento preoperatorio de catarata: texto real de la médica
UPDATE public.documentos_clinicos
SET contenido = $doc$TRATAMIENTO CIRUGÍA DE CATARATAS

PREVIO A LA CIRUGÍA (DESDE 2 DÍAS ANTES):
- Lavarse la cara con jabón de iodopovidona 2 veces al día.
- Gatidex o Gatiflax D: 4 veces al día.
- Natax: 3 veces al día.
(Separar una gota de otra, 5 minutos.)

EL DÍA DE LA CIRUGÍA:
- Realizar los 3 pasos anteriores.
- Desde una hora antes del horario asignado, colocar Fotorretín en el ojo a operar (gota de tapa roja), 1 gota cada 15 minutos. Llevar estas gotas y entregarlas a la enfermera para seguir utilizándolas en quirófano durante la cirugía.
- 20 minutos antes del horario asignado, colocar en el ojo a operar 1 gota de Anestalcon, y a los 5 minutos 1 gota de Lidocaína 4%.
- Concurrir con el rostro higienizado con jabón de Pervinox, sin pinturas, perfumes ni alhajas.
- Se puede desayunar normalmente.
- No suspender medicaciones habituales (excepto aquellas que haya indicado suspender su oftalmólogo).
- El horario se confirma el día anterior.

TRATAMIENTO POSTOPERATORIO:
- Prednefrin Forte cada 2 horas. Agitar antes de usar.
- Gatidex cada 4 horas.
- Natax cada 8 horas.
- Acetazolamida comprimido vía oral: tomar 1 cada 6 horas.
- Control a las 24 horas en el consultorio.

Paciente: [NOMBRE_PACIENTE]  Fecha de cirugía: [FECHA]
Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]$doc$,
    updated_at = now()
WHERE nombre = 'Tratamiento preoperatorio - Cirugía de catarata'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);

-- 2) Nuevo tratamiento preoperatorio: inyección intravítrea
INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT 'tratamiento_preoperatorio',
       'Tratamiento preoperatorio - Inyección intravítrea (antiangiogénico)',
       $doc$TRATAMIENTO PREVIO A LA INYECCIÓN INTRAVÍTREA (ANTIANGIOGÉNICO)

PREVIO A LA CIRUGÍA (DESDE 2 DÍAS ANTES):
- Lavarse la cara con jabón de iodopovidona 2 veces al día.
- Gatif Forte: 4 veces al día.
- Natax: 3 veces al día.
(Separar una gota de otra, 5 minutos.)

EL DÍA DE LA INYECCIÓN:
- Realizar los 3 pasos anteriores.
- Concurrir con el rostro higienizado con jabón de Pervinox, sin pinturas, perfumes ni alhajas.
- Se puede desayunar normalmente.
- No suspender medicaciones habituales (excepto aquellas que haya indicado suspender su oftalmólogo).
- El horario se confirma el día anterior.

TRATAMIENTO POSTOPERATORIO:
- Gatif Forte cada 4 horas.
- Natax cada 8 horas.

Paciente: [NOMBRE_PACIENTE]  Fecha: [FECHA]
Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]$doc$,
       u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.documentos_clinicos d
  WHERE d.nombre = 'Tratamiento preoperatorio - Inyección intravítrea (antiangiogénico)'
);

-- 3) Práctica de electrocardiograma con el texto exacto de la médica
UPDATE public.practicas_estudios
SET nombre = 'Electrocardiograma y valoración de riesgo prequirúrgico',
    contenido = 'Solicito Electrocardiograma y valoración de riesgo prequirúrgico. DIAG: prequirúrgico cirugía de cataratas.',
    updated_at = now()
WHERE nombre = 'Electrocardiograma'
  AND owner_id = (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1);