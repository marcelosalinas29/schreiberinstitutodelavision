import { createFileRoute } from "@tanstack/react-router";

import { SeccionPracticas } from "@/features/practicas/SeccionPracticas";

export const Route = createFileRoute("/_authenticated/laboratorio")({
  head: () => ({
    meta: [
      { title: "Laboratorio — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Análisis de laboratorio agrupados por categoría, listos para pedir e imprimir.",
      },
      { property: "og:title", content: "Laboratorio — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Análisis de laboratorio agrupados por categoría." },
    ],
  }),
  component: () => (
    <SeccionPracticas
      seccion="Laboratorio"
      title="Laboratorio"
      description="Análisis de laboratorio agrupados por categoría."
    />
  ),
});
