import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PatientForm, calcularEdad } from "@/features/patients/PatientForm";
import { listPacientes } from "@/services/pacientes";
import { listHistoriasPaciente } from "@/services/historias";
import type { Paciente } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — Schreiber Instituto de la Visión" },
      { name: "description", content: "Buscá, registrá y consultá la ficha completa de cada paciente del consultorio." },
      { property: "og:title", content: "Pacientes — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Padrón de pacientes con datos de contacto, obra social e historial de consultas." },
    ],
  }),
  component: Pacientes,
});

function Pacientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);

  const pacientes = useQuery({ queryKey: ["pacientes", search], queryFn: () => listPacientes(search) });
  const historias = useQuery({
    queryKey: ["historias", seleccionado?.id],
    enabled: Boolean(seleccionado?.id),
    queryFn: () => listHistoriasPaciente(seleccionado!.id),
  });

  const alGuardar = (p: Paciente) => {
    setOpen(false);
    setEditando(null);
    setSeleccionado(p);
    void qc.invalidateQueries({ queryKey: ["pacientes"] });
  };

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Padrón del consultorio con historial clínico asociado."
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditando(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditando(null)}>
                <Plus className="size-4" /> Nuevo paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editando ? "Editar paciente" : "Nuevo paciente"}</DialogTitle>
              </DialogHeader>
              <PatientForm
                key={editando?.id ?? "nuevo"}
                paciente={editando}
                onSaved={alGuardar}
                onAbrirExistente={(p) => {
                  setOpen(false);
                  setEditando(null);
                  setSeleccionado(p);
                }}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, apellido o DNI"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="panel divide-y divide-border">
          {pacientes.isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : (pacientes.data?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Sin resultados.</p>
          ) : (
            pacientes.data!.map((p) => (
              <button
                key={p.id}
                onClick={() => setSeleccionado(p)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.apellido}, {p.nombre}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.dni ? `DNI ${p.dni}` : "Sin DNI"}
                    {p.obra_social ? ` · ${p.obra_social}` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{p.telefono ?? ""}</span>
              </button>
            ))
          )}
        </div>

        <aside className="panel h-fit p-5">
          {!seleccionado ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Elegí un paciente para ver su ficha.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {seleccionado.apellido}, {seleccionado.nombre}
                  </h2>
                  {seleccionado.fecha_nacimiento && calcularEdad(seleccionado.fecha_nacimiento) ? (
                    <Badge variant="secondary" className="mt-1">
                      {calcularEdad(seleccionado.fecha_nacimiento)}
                    </Badge>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditando(seleccionado);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" /> Editar
                </Button>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Dato label="DNI" value={seleccionado.dni} />
                <Dato label="Nacimiento" value={seleccionado.fecha_nacimiento} />
                <Dato label="Teléfono" value={seleccionado.telefono} />
                <Dato label="Email" value={seleccionado.email} />
                <Dato label="Obra social" value={seleccionado.obra_social} />
                <Dato label="Plan" value={seleccionado.plan} />
                <Dato label="Afiliado" value={seleccionado.nro_afiliado} />
                <Dato label="Dirección" value={seleccionado.direccion} />
                <Dato label="Localidad" value={seleccionado.localidad} />
                <Dato label="Notas" value={seleccionado.notas} />
              </dl>

              <h3 className="mb-2 mt-6 text-sm font-semibold">Consultas</h3>
              {historias.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (historias.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Sin historias clínicas registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {historias.data!.map((h) => (
                    <li
                      key={h.id}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        void navigate({ to: "/consulta", search: { paciente: seleccionado.id, historia: h.id } })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void navigate({ to: "/consulta", search: { paciente: seleccionado.id, historia: h.id } });
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-border p-3 transition-colors hover:border-primary/50 hover:bg-accent/60"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(h.fecha).toLocaleDateString("es-AR")}
                      </p>
                      <p className="mt-1 text-sm">{h.diagnostico || h.motivo_consulta || "Sin diagnóstico cargado"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Dato({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}
