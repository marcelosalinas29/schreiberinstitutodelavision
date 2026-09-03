import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { SelectorYPedido } from "@/features/practicas/SelectorYPedido";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  agruparPorSeccion,
  deletePractica,
  listPracticas,
  upsertPractica,
} from "@/services/practicas";

const VACIO = { nombre: "", codigo: "", obra_social: "", categoria: "", contenido: "" };
type Form = typeof VACIO & { id?: string };

interface Props {
  /** Sección de nivel superior a mostrar (debe coincidir con practicas_estudios.seccion). */
  seccion: string;
  title: string;
  description: string;
}

export function SeccionPracticas({ seccion, title, description }: Props) {
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
        categoria: form.categoria.trim() || null,
        seccion,
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

  const grupos = agruparPorSeccion(practicas.data ?? []);
  const subgrupos = grupos.find(([s]) => s === seccion)?.[1] ?? [];

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nueva práctica
          </Button>
        }
      />

      <SelectorYPedido seccion={seccion} />

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
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoría / subdivisión</Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
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
        {subgrupos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ítems cargados en esta sección.</p>
        ) : null}
        {subgrupos.map(([sub, items]) => (
          <section key={sub} className="panel p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{sub}</h2>
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
                          categoria: p.categoria ?? "",
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
