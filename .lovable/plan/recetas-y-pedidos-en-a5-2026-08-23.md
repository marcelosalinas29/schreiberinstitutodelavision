# Recetas y pedidos en A5

Hoy todos los PDF se generan en A4 (21 × 29,7 cm). Pasamos recetas y pedidos de estudios a A5 (14,8 × 21 cm), manteniendo consentimientos y protocolos en A4.

## Qué cambia

- La receta y el pedido de estudios salen en hoja A5 vertical, listos para imprimir en ese tamaño.
- Todo el contenido se reescala al ancho menor: logo del membrete, márgenes, tamaños de letra, línea dorada, bloque de datos del paciente, texto clínico, firma/sello y pie de página.
- Si el texto no entra en una hoja A5, se continúa en una segunda página con el mismo membrete y pie, en vez de recortarse.
- Consentimientos y protocolos siguen igual, en A4.

## Detalle técnico

- En `src/lib/pdf.ts`, `generarRecetaPDF` acepta un parámetro de formato (`"a4" | "a5"`, por defecto A4) que se pasa a `new jsPDF`.
- Se reemplazan las constantes fijas de página (ancho 210, pie en y=285, límites de firma 235/279/288) por valores derivados de `doc.internal.pageSize`, para que ambos formatos usen el mismo código.
- Márgenes y escala: margen 12 mm y ancho de logo ~46 mm en A5; se conservan 18 mm y 62 mm en A4. Tipografías se reducen ~1 pt en A5.
- Firma/sello: el alto máximo se ajusta al espacio disponible de la hoja para que nunca pise el pie ni el texto clínico.
- En `src/routes/_authenticated/consulta.tsx`, las llamadas de "Receta PDF" y "Pedido de estudios" pasan `formato: "a5"`; la de consentimientos queda sin cambios.

## Verificación

Se generan las tres salidas de prueba y se revisan las páginas renderizadas para confirmar que no haya texto cortado, superposición de firma ni pie desplazado.
