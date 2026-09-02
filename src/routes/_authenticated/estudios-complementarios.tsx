import { createFileRoute } from "@tanstack/react-router";

import { SeccionPracticas } from "@/features/practicas/SeccionPracticas";

export const Route = createFileRoute("/_authenticated/estudios-complementarios")({
  head: () => ({
    meta: [
      { title: "Otros estudios complementarios — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Estudios complementarios agrupados por categoría, listos para pedir e imprimir.",
      },
      { property: "og:title", content: "Otros estudios complementarios — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Estudios complementarios agrupados por categoría." },
    ],
  }),
  component: () => (
    <SeccionPracticas
      seccion="Otros estudios complementarios"
      title="Otros estudios complementarios"
      description="Estudios complementarios agrupados por categoría."
    />
  ),
});
