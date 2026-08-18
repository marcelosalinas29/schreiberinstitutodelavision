import jsPDF from "jspdf";

import firmaSelloAsset from "@/assets/firma-sello-schreiber.png.asset.json";
import { LOGO_HORIZONTAL_TRANSPARENTE_URL } from "@/components/layout/Logo";
import type { MedicoReceta } from "@/services/perfil";
import type { Paciente, Plantilla } from "@/types/domain";

interface RecetaInput {
  paciente: Pick<Paciente, "nombre" | "apellido" | "dni" | "obra_social" | "nro_afiliado">;
  contenido: string;
  fecha: Date;
  plantilla?: Plantilla | null;
  titulo?: string;
  /** Datos del profesional logueado (nombre, matrículas y firma/sello). */
  medico?: MedicoReceta | null;
}


function wrap(doc: jsPDF, text: string, x: number, y: number, width: number, lineHeight = 6): number {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Datos fijos del membrete institucional. */
export const MEMBRETE = {
  institucion: "Schreiber Instituto de la Visión",
  direccion: "San Lorenzo 685 · Reconquista, Santa Fe",
  pie: "SCHREIBER · INSTITUTO DE LA VISIÓN   |   San Lorenzo 685 · Reconquista, Santa Fe",
};

const cacheImagenes = new Map<string, string | null>();

async function cargarImagen(url: string): Promise<string | null> {
  if (cacheImagenes.has(url)) return cacheImagenes.get(url) ?? null;
  let out: string | null = null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    out = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    out = null;
  }
  cacheImagenes.set(url, out);
  return out;
}

/** Genera una receta / indicación en PDF usando la plantilla del profesional. */
export async function generarRecetaPDF({ paciente, contenido, fecha, plantilla, medico, titulo = "Receta" }: RecetaInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 210 - margin * 2;
  let y = margin;

  // Membrete institucional centrado, igual al diseño impreso.
  const logo = await cargarImagen(LOGO_HORIZONTAL_TRANSPARENTE_URL);
  if (logo) {
    const props = doc.getImageProperties(logo);
    const w = 62;
    const h = (props.height / props.width) * w;
    doc.addImage(logo, "PNG", (210 - w) / 2, y, w, h, undefined, "FAST");
    y += h + 4;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(plantilla?.institucion ?? MEMBRETE.institucion, 105, y + 6, { align: "center" });
    y += 12;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 120, 60);
  const encabezado = [plantilla?.direccion ?? MEMBRETE.direccion, plantilla?.telefono].filter(Boolean).join(" · ");
  doc.text(encabezado, 105, y, { align: "center" });
  doc.setTextColor(0);
  y += 6;

  doc.setDrawColor(200, 175, 120);
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

  // Pie de firma: se ubica debajo del texto clínico, sin superponerse nunca.
  const pieTexto = plantilla?.pie_pagina ? 279 : 288;
  const firmaY = Math.min(Math.max(y + 34, 235), pieTexto - 16);

  // Sello / firma digital del profesional logueado; si no cargó ninguno se usa el sello institucional.
  const usaSelloInstitucional = !medico?.firmaDataUrl;
  const firmaImg = medico?.firmaDataUrl ?? (await cargarImagen(firmaSelloAsset.url));
  if (firmaImg) {
    try {
      const props = doc.getImageProperties(firmaImg);
      const maxW = usaSelloInstitucional ? 78 : 55;
      const maxH = usaSelloInstitucional ? 40 : 24;
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      doc.addImage(firmaImg, margin + (78 - w) / 2, firmaY - h + (usaSelloInstitucional ? 6 : -1), w, h, undefined, "FAST");
    } catch {
      /* firma inválida: se omite */
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(0);
  // El sello institucional trae su propia línea de firma.
  if (!usaSelloInstitucional) doc.line(margin, firmaY, margin + 70, firmaY);
  const firma = [
    medico?.nombre ?? plantilla?.profesional,
    medico?.especialidad ?? null,
    (medico?.matricula ?? plantilla?.matricula) ? `M.P. ${medico?.matricula ?? plantilla?.matricula}` : null,
    medico?.matricula_nacional ? `M.N. ${medico.matricula_nacional}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  // El sello institucional ya incluye nombre y matrícula: no se duplica el texto.
  if (firma && !usaSelloInstitucional) wrap(doc, firma, margin, firmaY + 5, 90, 4.5);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(plantilla?.pie_pagina || MEMBRETE.pie, 105, 285, { align: "center" });
  doc.setTextColor(0);

  doc.save(`${titulo.toLowerCase()}-${paciente.apellido}-${fecha.toISOString().slice(0, 10)}.pdf`);
}
