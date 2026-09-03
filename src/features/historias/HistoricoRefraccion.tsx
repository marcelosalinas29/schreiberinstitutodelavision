import { useQuery } from "@tanstack/react-query";

import { listHistoriasPaciente } from "@/services/historias";
import { formatearFechaLocal } from "@/lib/fecha";

/** Cuadro compacto con el historial de recetas ópticas (lejos / cerca) del paciente. */
export function HistoricoRefraccion({ pacienteId, className }: { pacienteId: string; className?: string }) {
  const historias = useQuery({
    queryKey: ["historias", pacienteId],
    enabled: Boolean(pacienteId),
    queryFn: () => listHistoriasPaciente(pacienteId),
  });

  /** "Esf Cil x Eje" con las columnas nuevas; si no hay, cae al texto viejo. */
  const fmt = (esf?: string | null, cil?: string | null, eje?: string | null, viejo?: string | null) => {
    const e = (esf ?? "").trim();
    const c = (cil ?? "").trim();
    const j = (eje ?? "").trim();
    if (e || c || j) {
      const base = [e, c].filter(Boolean).join(" ");
      return j ? `${base || "—"} x ${j}` : base;
    }
    return (viejo ?? "").trim() || "—";
  };

  const tieneReceta = (h: Record<string, unknown>) =>
    [
      "refraccion_od",
      "refraccion_oi",
      "refraccion_cerca_od",
      "refraccion_cerca_oi",
      "refraccion_od_esf",
      "refraccion_od_cil",
      "refraccion_od_eje",
      "refraccion_oi_esf",
      "refraccion_oi_cil",
      "refraccion_oi_eje",
      "refraccion_cerca_od_esf",
      "refraccion_cerca_od_cil",
      "refraccion_cerca_od_eje",
      "refraccion_cerca_oi_esf",
      "refraccion_cerca_oi_cil",
      "refraccion_cerca_oi_eje",
    ].some((k) => typeof h[k] === "string" && (h[k] as string).trim() !== "");

  const recetas = (historias.data ?? [])
    .filter((h) => tieneReceta(h as unknown as Record<string, unknown>))
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
