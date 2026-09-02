import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Stethoscope, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listPacientes } from "@/services/pacientes";
import {
  agregarPacienteInvestigacion,
  eliminarPacienteInvestigacion,
  listPacientesInvestigacion,
} from "@/services/investigacion";

export const Route = createFileRoute("/_authenticated/investigacion")({
  head: () => ({
    meta: [
      { title: "Casos de interés — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Lista privada de pacientes de interés para trabajos de investigación y casos científicos.",
      },
      { property: "og:title", content: "Casos de interés — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Pacientes seleccionados para trabajos científicos." },
    ],
  }),
  component: Investigacion,
});

function Investigacion() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState("");
  const [notas, setNotas] = useState("");

  const pacientes = useQuery({ queryKey: ["pacientes", busqueda], queryFn: () => listPacientes(busqueda) });
  const lista = useQuery({ queryKey: ["pacientes-investigacion"], queryFn: listPacientesInvestigacion });

  const seleccionado = useMemo(
    () => (pacientes.data ?? []).find((p) => p.id === pacienteId) ?? null,
    [pacientes.data, pacienteId],
  );

  const agregar = useMutation({
    mutationFn: async () => {
      if (!pacienteId) throw new Error("Elegí un paciente");
      await agregarPacienteInvestigacion(pacienteId, diagnostico, notas);
    },
    onSuccess: () => {
      toast.success("Paciente agregado a la lista");
      setPacienteId(null);
      setDiagnostico("");
      setNotas("");
      setBusqueda("");
      void qc.invalidateQueries({ queryKey: ["pacientes-investigacion"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo agregar"),
  });

  const quitar = useMutation({
    mutationFn: (id: string) => eliminarPacienteInvestigacion(id),
    onSuccess: () => {
      toast.success("Paciente quitado de la lista");
      void qc.invalidateQueries({ queryKey: ["pacientes-investigacion"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo quitar"),
  });

  const resultados = (pacientes.data ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Casos de interés"
        description="Lista privada de pacientes para trabajos de investigación o casos científicos."
      />

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Buscar paciente</Label>
          <Input
            placeholder="Apellido, nombre o DNI…"
            value={seleccionado ? `${seleccionado.apellido}, ${seleccionado.nombre}` : busqueda}
            onChange={(e) => {
              setPacienteId(null);
              setBusqueda(e.target.value);
            }}
          />
          {!seleccionado && busqueda.trim().length > 1 ? (
            <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {resultados.length === 0 ? (
                <li className="p-2 text-sm text-muted-foreground">Sin resultados</li>
              ) : (
                resultados.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => setPacienteId(p.id)}
                    >
                      {p.apellido}, {p.nombre}
                      {p.dni ? <span className="text-muted-foreground"> · DNI {p.dni}</span> : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Diagnóstico / motivo de interés</Label>
          <Input value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)} placeholder="Ej. Uveítis HLA B27" />
        </div>

        <div className="space-y-1.5">
          <Label>Notas (opcional)</Label>
          <Textarea rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>

        <Button type="button" disabled={!pacienteId || agregar.isPending} onClick={() => agregar.mutate()}>
          <Plus className="size-4" />
          Agregar a la lista
        </Button>
      </section>

      <section className="space-y-2">
        {(lista.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay pacientes en la lista.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {(lista.data ?? []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.pacientes ? `${item.pacientes.apellido}, ${item.pacientes.nombre}` : "Paciente"}
                  </p>
                  {item.diagnostico ? <p className="text-sm text-muted-foreground">{item.diagnostico}</p> : null}
                  {item.notas ? <p className="text-xs text-muted-foreground">{item.notas}</p> : null}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/consulta" search={{ paciente: item.paciente_id }}>
                    <Stethoscope className="size-4" />
                    Historia clínica
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => quitar.mutate(item.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
