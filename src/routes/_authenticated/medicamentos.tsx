import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteMedicamento, listMedicamentos, upsertMedicamento } from "@/services/medicamentos";

export const Route = createFileRoute("/_authenticated/medicamentos")({
  head: () => ({
    meta: [
      { title: "Medicamentos — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Vademécum propio: cargá medicamentos con dosis y posología para agregarlos a la receta en un clic.",
      },
      { property: "og:title", content: "Medicamentos — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Vademécum oftalmológico con dosis y posología lista para la receta." },
    ],
  }),
  component: Medicamentos,
});

const VACIO = { nombre: "", dosis: "", posologia: "", via_administracion: "", unidades_envase: "" };
type Form = typeof VACIO & { id?: string };

function Medicamentos() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const medicamentos = useQuery({
    queryKey: ["medicamentos", busqueda],
    queryFn: () => listMedicamentos(busqueda),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.nombre.trim() || !form.posologia.trim()) throw new Error("Completá nombre y posología");
      await upsertMedicamento({
        ...(form.id ? { id: form.id } : {}),
        nombre: form.nombre.trim(),
        dosis: form.dosis.trim() || null,
        posologia: form.posologia.trim(),
        via_administracion: form.via_administracion.trim() || null,
        unidades_envase: form.unidades_envase.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Medicamento guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deleteMedicamento(id),
    onSuccess: () => {
      toast.success("Medicamento eliminado");
      void qc.invalidateQueries({ queryKey: ["medicamentos"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  return (
    <div>
      <PageHeader
        title="Medicamentos"
        description="Vademécum con dosis y posología listas para insertar en el tratamiento y la receta."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nuevo medicamento
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nombre">Nombre comercial (principio activo)</Label>
            <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dosis">Dosis / concentración</Label>
            <Input id="dosis" value={form.dosis} onChange={(e) => setForm({ ...form, dosis: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="via">Vía de administración</Label>
            <Input
              id="via"
              value={form.via_administracion}
              onChange={(e) => setForm({ ...form, via_administracion: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unidades">Unidades por envase</Label>
            <Input
              id="unidades"
              value={form.unidades_envase}
              onChange={(e) => setForm({ ...form, unidades_envase: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="posologia">Posología</Label>
            <Textarea
              id="posologia"
              rows={3}
              value={form.posologia}
              onChange={(e) => setForm({ ...form, posologia: e.target.value })}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              <Save className="size-4" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
              <X className="size-4" /> Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <div className="panel p-5">
        <Input
          className="mb-3 max-w-sm"
          placeholder="Buscar medicamento…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {(medicamentos.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay medicamentos para mostrar.</p>
        ) : null}
        <ul className="divide-y divide-border">
          {(medicamentos.data ?? []).map((m) => (
            <li key={m.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {m.nombre}
                  {m.dosis ? <span className="ml-2 text-xs text-muted-foreground">{m.dosis}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">{m.posologia}</p>
                <p className="text-xs text-muted-foreground">
                  {[m.via_administracion, m.unidades_envase].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      id: m.id,
                      nombre: m.nombre,
                      dosis: m.dosis ?? "",
                      posologia: m.posologia,
                      via_administracion: m.via_administracion ?? "",
                      unidades_envase: m.unidades_envase ?? "",
                    })
                  }
                >
                  Editar
                </Button>
                <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar.mutate(m.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
