import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Users, Wallet, Stethoscope } from "lucide-react";

import { PageHeader, StatCard } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/useAuth";
import { calcularTotales, listCobrosPorFecha } from "@/services/caja";
import { listPacientes } from "@/services/pacientes";
import { listTurnosPorRango } from "@/services/turnos";
import { ESTADOS_TURNO } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel del día — Schreiber Instituto de la Visión" },
      { name: "description", content: "Resumen diario de turnos, pacientes y recaudación del consultorio." },
      { property: "og:title", content: "Panel del día — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Turnos del día, estado de la sala de espera y caja en tiempo real." },
    ],
  }),
  component: Panel,
});

const hoyISO = () => new Date().toISOString().slice(0, 10);

function Panel() {
  const { profile, isMedico } = useCurrentUser();
  const fecha = hoyISO();
  const desde = `${fecha}T00:00:00`;
  const hasta = `${fecha}T23:59:59`;

  const turnos = useQuery({ queryKey: ["turnos", fecha], queryFn: () => listTurnosPorRango(desde, hasta) });
  const cobros = useQuery({ queryKey: ["cobros", fecha], queryFn: () => listCobrosPorFecha(fecha) });
  const pacientes = useQuery({ queryKey: ["pacientes", ""], queryFn: () => listPacientes("") });

  const totales = calcularTotales(cobros.data ?? []);
  const enEspera = (turnos.data ?? []).filter((t) => t.estado === "en_espera");
  const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

  return (
    <div>
      <PageHeader
        title={`Hola${profile?.nombre_completo ? `, ${profile.nombre_completo.split(" ")[0]}` : ""}`}
        description={new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
        actions={
          <Button asChild size="sm">
            <Link to="/agenda">Ver agenda</Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Turnos hoy" value={String(turnos.data?.length ?? 0)} icon={<CalendarDays className="size-4" />} />
        <StatCard label="En sala de espera" value={String(enEspera.length)} icon={<Stethoscope className="size-4" />} />
        <StatCard label="Recaudado hoy" value={money(totales.total)} hint={`${totales.cantidad} movimientos`} icon={<Wallet className="size-4" />} />
        <StatCard label="Pacientes registrados" value={String(pacientes.data?.length ?? 0)} icon={<Users className="size-4" />} />
      </div>

      <section className="panel mt-6 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Turnos de hoy</h2>
          {isMedico ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/consulta">Iniciar consulta</Link>
            </Button>
          ) : null}
        </div>

        {turnos.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Cargando turnos…</p>
        ) : (turnos.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay turnos agendados para hoy.</p>
        ) : (
          <ul className="divide-y divide-border">
            {turnos.data!.map((turno) => (
              <li key={turno.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {turno.paciente ? `${turno.paciente.apellido}, ${turno.paciente.nombre}` : "Sin paciente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(turno.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    {turno.motivo ? ` · ${turno.motivo}` : ""}
                  </p>
                </div>
                <Badge variant="secondary">{ESTADOS_TURNO.find((e) => e.value === turno.estado)?.label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
