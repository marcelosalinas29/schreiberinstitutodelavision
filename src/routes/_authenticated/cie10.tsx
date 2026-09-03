import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteCie10, listCie10, upsertCie10 } from "@/services/cie10";

export const Route = createFileRoute("/_authenticated/cie10")({
  head: () => ({
    meta: [
      { title: "Diccionario CIE-10 — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Palabras clave y códigos CIE-10 para sugerir automáticamente el código del diagnóstico.",
      },
      { property: "og:title", content: "Diccionario CIE-10 — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Sugerencia automática de códigos CIE-10 a partir del diagnóstico." },
    ],
  }),
  component: Cie10Page,
});

const VACIO = { palabra_clave: "", codigo: "", descripcion: "" };

/** Diagnósticos de consulta rápida, se resuelven contra el diccionario cargado. */
const FRECUENTES = [
  "Catarata",
  "Glaucoma",
  "Conjuntivitis",
  "Queratitis",
  "Ametropía",
  "Miopía",
  "Astigmatismo",
  "Presbicia",
  "Hipermetropía",
  "Dolor ocular",
  "Inflamación ocular",
  "Cefaleas",
  "Hipertensión ocular",
];

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
type Form = typeof VACIO & { id?: string };

function Cie10Page() {
  const qc = useQueryClient();
  const entradas = useQuery({ queryKey: ["cie10"], queryFn: listCie10 });
  const [form, setForm] = useState<Form | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.palabra_clave.trim() || !form.codigo.trim() || !form.descripcion.trim())
        throw new Error("Completá palabra clave, código y descripción");
      await upsertCie10({
        ...(form.id ? { id: form.id } : {}),
        palabra_clave: form.palabra_clave.trim(),
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Entrada guardada");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["cie10"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deleteCie10(id),
    onSuccess: () => {
      toast.success("Entrada eliminada");
      void qc.invalidateQueries({ queryKey: ["cie10"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const items = entradas.data ?? [];

  return (
    <div>
      <PageHeader
        title="Diccionario CIE-10"
        description="Al escribir el diagnóstico, el sistema sugiere el código según estas palabras clave."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nueva entrada
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="palabra">Palabra clave</Label>
            <Input
              id="palabra"
              placeholder="catarata"
              value={form.palabra_clave}
              onChange={(e) => setForm({ ...form, palabra_clave: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código CIE-10</Label>
            <Input
              id="codigo"
              placeholder="H25.9"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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

      <section className="panel mb-4 border-primary/40 p-5">
        <h2 className="mb-3 text-sm font-semibold">Diagnósticos más frecuentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Diagnóstico</th>
                <th className="py-2 font-medium">Código CIE-10</th>
              </tr>
            </thead>
            <tbody>
              {FRECUENTES.map((nombre) => {
                const match = items.find(
                  (c) =>
                    normalizar(c.palabra_clave) === normalizar(nombre) ||
                    normalizar(c.descripcion) === normalizar(nombre),
                );
                return (
                  <tr key={nombre} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5 pr-4">{nombre}</td>
                    <td className="py-1.5 font-semibold text-primary">{match?.codigo ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste entradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.palabra_clave}
                    <span className="ml-2 text-xs font-semibold text-primary">{c.codigo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{c.descripcion}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        id: c.id,
                        palabra_clave: c.palabra_clave,
                        codigo: c.codigo,
                        descripcion: c.descripcion,
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar.mutate(c.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
