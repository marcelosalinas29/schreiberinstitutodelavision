import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { listHistoriasVacias } from "@/services/historias";
import { formatearFechaLocal } from "@/lib/fecha";

export const Route = createFileRoute("/_authenticated/historias-vacias")({
  head: () => ({
    meta: [
      { title: "Historias vacías — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Revisión de historias clínicas sin datos cargados, candidatas a depuración.",
      },
      { property: "og:title", content: "Historias vacías — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Listado de consultas sin contenido clínico para revisar." },
    ],
  }),
  component: HistoriasVacias,
});

function HistoriasVacias() {
  const vacias = useQuery({ queryKey: ["historias-vacias"], queryFn: listHistoriasVacias });
  const filas = vacias.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historias vacías"
        description="Consultas sin ningún dato clínico cargado y sin estudios adjuntos. Solo revisión: no se borra nada acá."
      />

      <div className="rounded-lg border border-border/60 p-4">
        {vacias.isLoading ? (
          <p className="text-sm text-muted-foreground">Buscando historias vacías…</p>
        ) : vacias.isError ? (
          <p className="text-sm text-destructive">No se pudo cargar el listado.</p>
        ) : filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay historias vacías. Todo limpio.</p>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium">
              {filas.length} {filas.length === 1 ? "historia vacía encontrada" : "historias vacías encontradas"}
            </p>
            <ul className="divide-y divide-border/60">
              {filas.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.paciente_nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Fecha: {h.fecha ? formatearFechaLocal(h.fecha) : "—"} · Creada:{" "}
                      {new Date(h.created_at).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/consulta" search={{ paciente: h.paciente_id, historia: h.id }}>
                      <Stethoscope className="size-4" /> Abrir
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
