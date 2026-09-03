/** Fecha de HOY en formato AAAA-MM-DD, usando la hora LOCAL del dispositivo (no UTC). */
export function hoyISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/** Convierte un Date a "AAAA-MM-DD" usando la hora local. */
export function aFechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

/** Parsea un string "AAAA-MM-DD" como fecha LOCAL (no UTC), para mostrarla sin que retroceda un día. */
export function parsearFechaLocal(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Atajo: formatea un "AAAA-MM-DD" a fecha local legible en español argentino. */
export function formatearFechaLocal(fechaISO: string, opciones?: Intl.DateTimeFormatOptions): string {
  return parsearFechaLocal(fechaISO).toLocaleDateString("es-AR", opciones);
}
