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
import { agruparPracticas, deletePractica, listPracticas, upsertPractica } from "@/services/practicas";

export const Route = createFileRoute("/_authenticated/practicas")({
  head: () => ({
    meta: [
      { title: "Prácticas y estudios — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Administrá los pedidos de prácticas y estudios por obra social para imprimirlos en un clic.",
      },
      { property: "og:title", content: "Prácticas y estudios — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Pedidos de estudios oftalmológicos adaptados a cada obra social." },
    ],
  }),
  component: Practicas,
});

const VACIO = { nombre: "", codigo: "", obra_social: "", contenido: "" };
type Form = typeof VACIO & { id?: string };

function Practicas() {
  const qc = useQueryClient();
  const practicas = useQuery({ queryKey: ["practicas"], queryFn: listPracticas });
  const [form, setForm] = useState<Form | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.nombre.trim() || !form.contenido.trim()) throw new Error("Completá nombre y contenido");
      await upsertPractica({
        ...(form.id ? { id: form.id } : {}),
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim() || null,
        obra_social: form.obra_social.trim() || null,
        contenido: form.contenido.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Práctica guardada");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["practicas"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deletePractica(id),
    onSuccess: () => {
      toast.success("Práctica eliminada");
      void qc.invalidateQueries({ queryKey: ["practicas"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const grupos = agruparPracticas(practicas.data ?? []);


  return (
    <div>
      <PageHeader
        title="Prácticas y estudios"
        description="Textos de pedidos de estudios listos para imprimir, agrupados por obra social."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nueva práctica
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código de nomenclador</Label>
            <Input id="codigo" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="obra_social">Obra social (vacío = general / particular)</Label>
            <Input
              id="obra_social"
              value={form.obra_social}
              onChange={(e) => setForm({ ...form, obra_social: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contenido">Contenido del pedido</Label>
            <Textarea
              id="contenido"
              rows={4}
              value={form.contenido}
              onChange={(e) => setForm({ ...form, contenido: e.target.value })}
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

      <div className="space-y-5">
        {grupos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste prácticas.</p>
        ) : null}
        {grupos.map(([grupo, items]) => (
          <section key={grupo} className="panel p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{grupo}</h2>
            <ul className="divide-y divide-border">
              {items.map((p) => (
                <li key={p.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {p.nombre}
                      {p.codigo ? <span className="ml-2 text-xs text-muted-foreground">{p.codigo}</span> : null}
                    </p>
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">{p.contenido}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          id: p.id,
                          nombre: p.nombre,
                          codigo: p.codigo ?? "",
                          obra_social: p.obra_social ?? "",
                          contenido: p.contenido,
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar.mutate(p.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
