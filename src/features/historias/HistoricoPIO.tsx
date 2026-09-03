import { useQuery } from "@tanstack/react-query";

import { listHistoriasPaciente } from "@/services/historias";
import { formatearFechaLocal } from "@/lib/fecha";

/** Cuadro compacto con el historial de PIO (presión intraocular) del paciente. */
export function HistoricoPIO({ pacienteId, className }: { pacienteId: string; className?: string }) {
  const historias = useQuery({
    queryKey: ["historias", pacienteId],
    enabled: Boolean(pacienteId),
    queryFn: () => listHistoriasPaciente(pacienteId),
  });

  const tomas = (historias.data ?? [])
    .filter((h) => h.pio_od != null || h.pio_oi != null)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold">Historial de PIO</h3>
      {historias.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : tomas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin registros de PIO previos</p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Fecha</th>
                <th className="px-2 py-1.5 text-left font-medium">Hora</th>
                <th className="px-2 py-1.5 text-right font-medium">OD</th>
                <th className="px-2 py-1.5 text-right font-medium">OI</th>
              </tr>
            </thead>
            <tbody>
              {tomas.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-2 py-1.5">{formatearFechaLocal(h.fecha)}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{h.pio_hora || "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.pio_od ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{h.pio_oi ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
