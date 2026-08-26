const CONSULTORIO_DEFAULT = "Schreiber Instituto de la Visión";

export function normalizarTelefonoAR(telefono: string): string {
  let n = (telefono ?? "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("54")) return n;
  if (n.startsWith("0")) n = n.replace(/^0+/, "");
  return `54${n}`;
}

/** Link de WhatsApp con un mensaje ya redactado por quien llama. */
export function armarLinkWhatsAppTexto(telefono: string, mensaje: string): string {
  return `https://wa.me/${normalizarTelefonoAR(telefono)}?text=${encodeURIComponent(mensaje)}`;
}

export function armarLinkRecordatorioTurno(
  telefono: string,
  nombrePaciente: string,
  fechaHora: string,
  nombreConsultorio?: string,
): string {
  const numero = normalizarTelefonoAR(telefono);
  const lugar = nombreConsultorio?.trim() || CONSULTORIO_DEFAULT;
  const mensaje = `Hola ${nombrePaciente}, le recordamos su turno en ${lugar} el día ${fechaHora}. Ante cualquier inconveniente, por favor avísenos. ¡Lo esperamos!`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
