INSERT INTO public.documentos_clinicos (tipo, nombre, contenido, owner_id)
SELECT 'protocolo_quirurgico', 'Informe de prácticas preelaborado', '
INFORME DE PRÁCTICAS PREELABORADO

Paciente: [NOMBRE_PACIENTE]   DNI: [DNI_PACIENTE]   Fecha: [FECHA]
Obra Social: ..................................  N° de Afiliado: ..................................

AV: ..............................................................................................
BMC: ...................................................... PIO: ............... / ............... mmHg

FONDO DE OJOS
O.D. ..................................................... O.I. .....................................................
Eje: ................................  Fijación: ................................  Otro: ................................

VISUSCOPÍA
Ángulo: ................................  Estructuras: ................................................................

GONIOSCOPÍA
Papilas: ..............................................  Excavación: ..............................................
Relación A-V: ..........................................  Máculas: ..........................................

OBI: ......................................................................................................

Otros: ....................................................................................................

Firma del profesional: ______________  Matrícula: [MATRICULA_MEDICO]
', u.id
FROM (SELECT id FROM auth.users WHERE email = 'marilischreiber@yahoo.com.ar' LIMIT 1) AS u(id)
WHERE NOT EXISTS (
  SELECT 1 FROM public.documentos_clinicos d
  WHERE d.nombre = 'Informe de prácticas preelaborado'
    AND d.tipo = 'protocolo_quirurgico'
);