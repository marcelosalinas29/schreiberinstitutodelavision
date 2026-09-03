import { useQuery } from "@tanstack/react-query";

import { listHistoriasPaciente } from "@/services/historias";

/** Cuadro compacto con el historial de recetas ópticas (lejos / cerca) del paciente. */
export function HistoricoRefraccion({ pacienteId, className }: { pacienteId: string; className?: string }) {
  const historias = useQuery({
    queryKey: ["historias", pacienteId],
    enabled: Boolean(pacienteId),
    queryFn: () => listHistoriasPaciente(pacienteId),
  });

  const recetas = (historias.data ?? [])
    .filter((h) => h.refraccion_od || h.refraccion_oi || h.refraccion_cerca_od || h.refraccion_cerca_oi)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));

  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold">Historial de lentes prescriptas</h3>
      {historias.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : recetas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin recetas ópticas previas</p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/70 text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium">Fecha</th>
                <th className="px-2 py-1.5 text-left font-medium">Lejos OD</th>
                <th className="px-2 py-1.5 text-left font-medium">Lejos OI</th>
                <th className="px-2 py-1.5 text-left font-medium">Cerca OD</th>
                <th className="px-2 py-1.5 text-left font-medium">Cerca OI</th>
              </tr>
            </thead>
            <tbody>
              {recetas.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-2 py-1.5">{formatearFechaLocal(h.fecha)}</td>
                  <td className="px-2 py-1.5">{h.refraccion_od || "—"}</td>
                  <td className="px-2 py-1.5">{h.refraccion_oi || "—"}</td>
                  <td className="px-2 py-1.5">{h.refraccion_cerca_od || "—"}</td>
                  <td className="px-2 py-1.5">{h.refraccion_cerca_oi || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
