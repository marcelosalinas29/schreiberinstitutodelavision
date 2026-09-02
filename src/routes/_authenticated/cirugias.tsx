import { createFileRoute } from "@tanstack/react-router";

import { SeccionPracticas } from "@/features/practicas/SeccionPracticas";

export const Route = createFileRoute("/_authenticated/cirugias")({
  head: () => ({
    meta: [
      { title: "Cirugías — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Listado de cirugías oftalmológicas con sus textos de pedido listos para imprimir.",
      },
      { property: "og:title", content: "Cirugías — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Cirugías oftalmológicas agrupadas por categoría." },
    ],
  }),
  component: () => (
    <SeccionPracticas
      seccion="Cirugías"
      title="Cirugías"
      description="Cirugías agrupadas por categoría."
    />
  ),
});
