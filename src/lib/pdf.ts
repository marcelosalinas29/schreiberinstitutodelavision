import jsPDF from "jspdf";

import firmaSelloAsset from "@/assets/firma-sello-schreiber.png.asset.json";
import { LOGO_HORIZONTAL_TRANSPARENTE_URL } from "@/components/layout/Logo";
import type { MedicoReceta } from "@/services/perfil";
import type { Paciente, Plantilla } from "@/types/domain";

export type FormatoPDF = "a4" | "a5";

interface RecetaInput {
  paciente: Pick<Paciente, "nombre" | "apellido" | "dni" | "obra_social" | "nro_afiliado">;
  contenido: string;
  fecha: Date;
  plantilla?: Plantilla | null;
  titulo?: string;
  /** Datos del profesional logueado (nombre, matrículas y firma/sello). */
  medico?: MedicoReceta | null;
  /** Tamaño de hoja: recetas y pedidos usan A5; el resto A4. */
  formato?: FormatoPDF;
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

/** Opciones de salida del PDF. Por defecto se descarga (comportamiento histórico). */
export interface OpcionesSalidaPDF {
  modo?: "descargar" | "imprimir";
}

/** Genera una receta / indicación en PDF usando la plantilla del profesional. */
export async function generarRecetaPDF(
  {
    paciente,
    contenido,
    fecha,
    plantilla,
    medico,
    titulo = "Receta",
    formato = "a4",
  }: RecetaInput,
  opciones?: OpcionesSalidaPDF,
) {
  const doc = new jsPDF({ unit: "mm", format: formato });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const esA5 = formato === "a5";
  const margin = esA5 ? 12 : 18;
  const width = pageW - margin * 2;
  const centro = pageW / 2;
  const pieY = pageH - 12;
  // Escala tipográfica: A5 usa un punto menos en cada nivel.
  const fs = {
    titulo: esA5 ? 10 : 11,
    encabezado: esA5 ? 8 : 9,
    datos: esA5 ? 9 : 10,
    cuerpo: esA5 ? 11 : 12,
    firma: esA5 ? 8 : 9,
    pie: esA5 ? 7 : 8,
  };
  let y = margin;

  const logo = await cargarImagen(LOGO_HORIZONTAL_TRANSPARENTE_URL);

  /** Dibuja el membrete institucional en la página actual y devuelve la Y libre. */
  const dibujarMembrete = (yInicial: number): number => {
    let yy = yInicial;
    if (logo) {
      const props = doc.getImageProperties(logo);
      const w = esA5 ? 46 : 62;
      const h = (props.height / props.width) * w;
      doc.addImage(logo, "PNG", (pageW - w) / 2, yy, w, h, undefined, "FAST");
      yy += h + 4;
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(esA5 ? 12 : 14);
      doc.text(plantilla?.institucion ?? MEMBRETE.institucion, centro, yy + 6, { align: "center" });
      yy += 12;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fs.encabezado);
    doc.setTextColor(150, 120, 60);
    const encabezado = [plantilla?.direccion ?? MEMBRETE.direccion, plantilla?.telefono].filter(Boolean).join(" · ");
    doc.text(encabezado, centro, yy, { align: "center" });
    doc.setTextColor(0);
    yy += esA5 ? 5 : 6;

    doc.setDrawColor(200, 175, 120);
    doc.line(margin, yy, pageW - margin, yy);
    return yy + (esA5 ? 6 : 8);
  };

  /** Pie institucional de la página actual. */
  const dibujarPie = () => {
    doc.setFontSize(fs.pie);
    doc.setTextColor(120);
    doc.text(plantilla?.pie_pagina || MEMBRETE.pie, centro, pieY, { align: "center" });
    doc.setTextColor(0);
  };

  y = dibujarMembrete(y);

  doc.setFontSize(fs.titulo);
  doc.setFont("helvetica", "bold");
  doc.text(titulo.toUpperCase(), margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(fecha.toLocaleDateString("es-AR"), pageW - margin, y, { align: "right" });
  y += esA5 ? 7 : 8;

  doc.setFontSize(fs.datos);
  const lhDatos = esA5 ? 4.5 : 5;
  y = wrap(doc, `Paciente: ${paciente.apellido}, ${paciente.nombre}`, margin, y, width, lhDatos);
  if (paciente.dni) y = wrap(doc, `DNI: ${paciente.dni}`, margin, y, width, lhDatos);
  if (paciente.obra_social) {
    y = wrap(
      doc,
      `Obra social: ${paciente.obra_social}${paciente.nro_afiliado ? ` — Afiliado ${paciente.nro_afiliado}` : ""}`,
      margin,
      y,
      width,
      lhDatos,
    );
  }
  y += esA5 ? 5 : 6;

  // Texto clínico con salto de página: nunca se recorta, continúa con membrete y pie.
  doc.setFontSize(fs.cuerpo);
  const lhCuerpo = esA5 ? 6 : 7;
  // Espacio reservado abajo para firma/sello.
  const reservaFirma = esA5 ? 34 : 44;
  const limiteCuerpo = pieY - 6 - reservaFirma;
  const lineas = doc.splitTextToSize(contenido || "—", width) as string[];
  for (const linea of lineas) {
    if (y > limiteCuerpo) {
      dibujarPie();
      doc.addPage();
      y = dibujarMembrete(margin);
      doc.setFontSize(fs.cuerpo);
    }
    doc.text(linea, margin, y);
    y += lhCuerpo;
  }

  // Pie de firma: se ubica debajo del texto clínico, sin superponerse nunca.
  const firmaMin = esA5 ? pageH * 0.62 : 235;
  const firmaY = Math.min(Math.max(y + (esA5 ? 24 : 34), firmaMin), pieY - (esA5 ? 14 : 16));

  // Sello / firma digital del profesional logueado; si no cargó ninguno se usa el sello institucional.
  const usaSelloInstitucional = !medico?.firmaDataUrl;
  const firmaImg = medico?.firmaDataUrl ?? (await cargarImagen(firmaSelloAsset.url));
  const cajaFirmaW = esA5 ? 58 : 78;
  if (firmaImg) {
    try {
      const props = doc.getImageProperties(firmaImg);
      const maxW = usaSelloInstitucional ? cajaFirmaW : cajaFirmaW * 0.7;
      // Alto máximo acotado al espacio libre entre el texto y el pie.
      const espacioLibre = Math.max(12, firmaY - y + (usaSelloInstitucional ? 6 : 0));
      const maxH = Math.min(usaSelloInstitucional ? (esA5 ? 30 : 40) : esA5 ? 18 : 24, espacioLibre);
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      doc.addImage(
        firmaImg,
        margin + (cajaFirmaW - w) / 2,
        firmaY - h + (usaSelloInstitucional ? 6 : -1),
        w,
        h,
        undefined,
        "FAST",
      );
    } catch {
      /* firma inválida: se omite */
    }
  }

  doc.setFontSize(fs.firma);
  doc.setTextColor(0);
  // El sello institucional trae su propia línea de firma.
  if (!usaSelloInstitucional) doc.line(margin, firmaY, margin + (esA5 ? 52 : 70), firmaY);
  const firma = [
    medico?.nombre ?? plantilla?.profesional,
    medico?.especialidad ?? null,
    (medico?.matricula ?? plantilla?.matricula) ? `M.P. ${medico?.matricula ?? plantilla?.matricula}` : null,
    medico?.matricula_nacional ? `M.N. ${medico.matricula_nacional}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  // El sello institucional ya incluye nombre y matrícula: no se duplica el texto.
  if (firma && !usaSelloInstitucional) wrap(doc, firma, margin, firmaY + 5, esA5 ? 70 : 90, esA5 ? 4 : 4.5);

  dibujarPie();

  if (opciones?.modo === "imprimir") {
    // Abre el PDF en una pestaña nueva y dispara el diálogo de impresión del navegador.
    try {
      (doc as unknown as { autoPrint?: () => void }).autoPrint?.();
    } catch {
      /* versión de jsPDF sin autoPrint: se abre igual, sin diálogo automático */
    }
    const url = doc.output("bloburl") as unknown as string;
    window.open(String(url), "_blank", "noopener,noreferrer");
    return;
  }

  doc.save(`${titulo.toLowerCase()}-${paciente.apellido}-${fecha.toISOString().slice(0, 10)}.pdf`);
}
