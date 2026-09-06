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

  /** Máximo entre la toma de PIO normal y los valores de la curva, por ojo. */
  const maximoOjo = (pio: number | null, ayunas: number | null, sobrecarga: number | null) => {
    const valores = [pio, ayunas, sobrecarga].filter((v): v is number => v != null);
    if (valores.length === 0) return { valor: null as number | null, deCurva: false };
    const valor = Math.max(...valores);
    return { valor, deCurva: pio == null || valor > pio };
  };

  const tomas = (historias.data ?? [])
    .map((h) => ({
      id: h.id,
      fecha: h.fecha,
      pio_hora: h.pio_hora,
      od: maximoOjo(h.pio_od, h.curva_pio_ayunas_od, h.curva_pio_sobrecarga_od),
      oi: maximoOjo(h.pio_oi, h.curva_pio_ayunas_oi, h.curva_pio_sobrecarga_oi),
    }))
    .filter((t) => t.od.valor != null || t.oi.valor != null)
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
              {tomas.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-2 py-1.5">{formatearFechaLocal(t.fecha)}</td>
                  <td className="px-2 py-1.5 text-muted-foreground">{t.pio_hora || "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {t.od.valor ?? "—"}
                    {t.od.deCurva && t.od.valor != null ? <span className="text-muted-foreground"> (curva)</span> : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {t.oi.valor ?? "—"}
                    {t.oi.deCurva && t.oi.valor != null ? <span className="text-muted-foreground"> (curva)</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
