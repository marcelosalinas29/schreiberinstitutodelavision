import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteLinkObraSocial,
  listLinksObrasSociales,
  upsertLinkObraSocial,
} from "@/services/linksObrasSociales";

export const Route = createFileRoute("/_authenticated/links-obras-sociales")({
  head: () => ({
    meta: [
      { title: "Links de obras sociales — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content: "Accesos directos a las plataformas online de recetas y pedidos de cada obra social.",
      },
      { property: "og:title", content: "Links de obras sociales — Schreiber Instituto de la Visión" },
      {
        property: "og:description",
        content: "Administrá los accesos a los sistemas de prescripción electrónica de cada cobertura.",
      },
    ],
  }),
  component: LinksObrasSociales,
});

const VACIO = { obra_social: "", nombre_plataforma: "", url: "" };
type Form = typeof VACIO & { id?: string };

function LinksObrasSociales() {
  const qc = useQueryClient();
  const links = useQuery({ queryKey: ["links-obras-sociales"], queryFn: listLinksObrasSociales });
  const [form, setForm] = useState<Form | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.obra_social.trim() || !form.nombre_plataforma.trim() || !form.url.trim()) {
        throw new Error("Completá obra social, plataforma y URL");
      }
      await upsertLinkObraSocial({
        ...(form.id ? { id: form.id } : {}),
        obra_social: form.obra_social.trim(),
        nombre_plataforma: form.nombre_plataforma.trim(),
        url: form.url.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Link guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["links-obras-sociales"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deleteLinkObraSocial(id),
    onSuccess: () => {
      toast.success("Link eliminado");
      void qc.invalidateQueries({ queryKey: ["links-obras-sociales"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  return (
    <div>
      <PageHeader
        title="Links de obras sociales"
        description="Accesos directos a las plataformas online donde cada cobertura exige cargar recetas o pedidos."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nuevo link
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="obra_social">Obra social (usá "General" si sirve para todas)</Label>
            <Input
              id="obra_social"
              value={form.obra_social}
              onChange={(e) => setForm({ ...form, obra_social: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plataforma">Nombre de la plataforma</Label>
            <Input
              id="plataforma"
              value={form.nombre_plataforma}
              onChange={(e) => setForm({ ...form, nombre_plataforma: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
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

      <section className="panel p-5">
        {links.data?.length ? (
          <ul className="divide-y divide-border">
            {links.data.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {l.nombre_plataforma}
                    <span className="ml-2 text-xs text-muted-foreground">{l.obra_social}</span>
                  </p>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-xs text-primary underline"
                  >
                    {l.url} <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setForm({
                        id: l.id,
                        obra_social: l.obra_social,
                        nombre_plataforma: l.nombre_plataforma,
                        url: l.url,
                      })
                    }
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Eliminar" onClick={() => borrar.mutate(l.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Todavía no cargaste links.</p>
        )}
      </section>
    </div>
  );
}
