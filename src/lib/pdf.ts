import jsPDF from "jspdf";

import type { Paciente, Plantilla } from "@/types/domain";

interface RecetaInput {
  paciente: Pick<Paciente, "nombre" | "apellido" | "dni" | "obra_social" | "nro_afiliado">;
  contenido: string;
  fecha: Date;
  plantilla?: Plantilla | null;
  titulo?: string;
}

function wrap(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 6): number {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Genera una receta / indicación en PDF usando la plantilla del profesional. */
export function generarRecetaPDF({ paciente, contenido, fecha, plantilla, titulo = "Receta" }: RecetaInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 210 - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(plantilla?.institucion ?? "Schreiber Instituto de la Visión", margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const encabezado = [plantilla?.direccion, plantilla?.telefono].filter(Boolean).join(" · ");
  if (encabezado) y = wrap(doc, encabezado, margin, y, width, 4.5) + 2;

  doc.setDrawColor(180);
  doc.line(margin, y, 210 - margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(titulo.toUpperCase(), margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(fecha.toLocaleDateString("es-AR"), 210 - margin, y, { align: "right" });
  y += 8;

  doc.setFontSize(10);
  y = wrap(doc, `Paciente: ${paciente.apellido}, ${paciente.nombre}`, margin, y, width, 5);
  if (paciente.dni) y = wrap(doc, `DNI: ${paciente.dni}`, margin, y, width, 5);
  if (paciente.obra_social) {
    y = wrap(
      doc,
      `Obra social: ${paciente.obra_social}${paciente.nro_afiliado ? ` — Afiliado ${paciente.nro_afiliado}` : ""}`,
      margin,
      y,
      width,
      5,
    );
  }
  y += 6;

  doc.setFontSize(12);
  y = wrap(doc, contenido || "—", margin, y, width, 7);

  const firmaY = Math.max(y + 30, 235);
  doc.setFontSize(9);
  doc.line(margin, firmaY, margin + 70, firmaY);
  const firma = [plantilla?.profesional, plantilla?.matricula ? `Mat. ${plantilla.matricula}` : null]
    .filter(Boolean)
    .join("\n");
  if (firma) wrap(doc, firma, margin, firmaY + 5, 90, 4.5);
  if (plantilla?.pie_pagina) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    wrap(doc, plantilla.pie_pagina, margin, 283, width, 4);
  }

  doc.save(`${titulo.toLowerCase()}-${paciente.apellido}-${fecha.toISOString().slice(0, 10)}.pdf`);
}
