import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Versión "para farmacia" del tratamiento: corta cada línea antes del separador
 * " — " (el que arma lineaTratamiento), dejando solo nombre y dosis del
 * medicamento. Las líneas sin ese separador quedan intactas.
 */
export function recetaSoloMedicamentos(texto: string): string {
  return (texto ?? "")
    .split("\n")
    .map((linea) => {
      const i = linea.indexOf(" — ");
      return i === -1 ? linea : linea.slice(0, i).trimEnd();
    })
    .join("\n");
}
