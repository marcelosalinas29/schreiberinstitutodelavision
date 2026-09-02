import { createFileRoute } from "@tanstack/react-router";

import { SeccionPracticas } from "@/features/practicas/SeccionPracticas";

export const Route = createFileRoute("/_authenticated/practicas")({
  head: () => ({
    meta: [
      { title: "Estudios y Prácticas — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Administrá los pedidos de estudios y prácticas por obra social para imprimirlos en un clic.",
      },
      { property: "og:title", content: "Estudios y Prácticas — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Pedidos de estudios oftalmológicos adaptados a cada obra social." },
    ],
  }),
  component: () => (
    <SeccionPracticas
      seccion="Estudios y Prácticas"
      title="Estudios y Prácticas"
      description="Textos de pedidos listos para imprimir, agrupados por obra social."
    />
  ),
});
