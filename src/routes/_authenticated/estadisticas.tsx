import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { getEstadisticas, type Periodos } from "@/services/estadisticas";

export const Route = createFileRoute("/_authenticated/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Indicadores del consultorio: cirugías, campos visuales, curvas de presión y asistencia.",
      },
      { property: "og:title", content: "Estadísticas — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Totales del mes y del año de la actividad del consultorio." },
    ],
  }),
  component: EstadisticasPage,
});

function Numero({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function Tarjeta({
  titulo,
  descripcion,
  datos,
  conSemana,
}: {
  titulo: string;
  descripcion?: string;
  datos: Periodos;
  conSemana?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-sm font-medium">{titulo}</p>
      {descripcion ? <p className="mb-3 text-xs text-muted-foreground">{descripcion}</p> : <div className="mb-3" />}
      <div className="flex gap-6">
        {conSemana ? <Numero label="Semana" value={datos.semana} /> : null}
        <Numero label="Mes" value={datos.mes} />
        <Numero label="Año" value={datos.anio} />
      </div>
    </div>
  );
}

function EstadisticasPage() {
  const q = useQuery({ queryKey: ["estadisticas"], queryFn: getEstadisticas });
  const d = q.data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Estadísticas"
        description="Actividad del consultorio en el mes y en el año en curso."
      />

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Calculando indicadores…</p>
      ) : q.isError || !d ? (
        <p className="text-sm text-destructive">No se pudieron cargar las estadísticas.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Tarjeta titulo="Cirugías" descripcion="Pedidos generados de prácticas quirúrgicas" datos={d.cirugias} />
          <Tarjeta titulo="Campos visuales" descripcion="Consultas con campo visual cargado" datos={d.camposVisuales} />
          <Tarjeta titulo="Curvas de presión" descripcion="Consultas con curva de PIO cargada" datos={d.curvasPio} />
          <Tarjeta titulo="Pacientes atendidos" descripcion="Turnos con estado atendido" datos={d.atendidos} conSemana />
          <Tarjeta titulo="Turnos cancelados" datos={d.cancelados} />
          <Tarjeta titulo="Ausentes" datos={d.ausentes} />
        </div>
      )}
    </div>
  );
}
