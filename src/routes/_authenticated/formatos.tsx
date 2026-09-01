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
import {
  deleteFormatoHistoria,
  listFormatosHistoria,
  upsertFormatoHistoria,
} from "@/services/formatosHistoria";

export const Route = createFileRoute("/_authenticated/formatos")({
  head: () => ({
    meta: [
      { title: "Formatos de historia clínica — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Plantillas de texto rápido para completar la historia clínica en un clic.",
      },
      { property: "og:title", content: "Formatos de historia clínica — Schreiber Instituto de la Visión" },
      {
        property: "og:description",
        content: "Creá y editá los formatos precargados que se insertan en la historia clínica.",
      },
    ],
  }),
  component: Formatos,
});

const VACIO = { nombre: "", contenido: "" };
type Form = typeof VACIO & { id?: string };

function Formatos() {
  const qc = useQueryClient();
  const formatos = useQuery({ queryKey: ["formatos-historia"], queryFn: listFormatosHistoria });
  const [form, setForm] = useState<Form | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.nombre.trim() || !form.contenido.trim()) throw new Error("Completá nombre y contenido");
      await upsertFormatoHistoria({
        ...(form.id ? { id: form.id } : {}),
        nombre: form.nombre.trim(),
        contenido: form.contenido,
      });
    },
    onSuccess: () => {
      toast.success("Formato guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["formatos-historia"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deleteFormatoHistoria(id),
    onSuccess: () => {
      toast.success("Formato eliminado");
      void qc.invalidateQueries({ queryKey: ["formatos-historia"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const items = formatos.data ?? [];

  return (
    <div>
      <PageHeader
        title="Formatos de historia clínica"
        description="Textos precargados que se insertan con un clic en el campo de historia clínica."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nuevo formato
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              rows={8}
              value={form.contenido}
              onChange={(e) => setForm({ ...form, contenido: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              <Save className="size-4" /> Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
              <X className="size-4" /> Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <section className="panel p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no cargaste formatos.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((f) => (
              <li key={f.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.nombre}</p>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{f.contenido}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ id: f.id, nombre: f.nombre, contenido: f.contenido })}
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar.mutate(f.id)}>
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
