import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TIPOS_DOCUMENTO,
  deleteDocumento,
  listDocumentos,
  upsertDocumento,
} from "@/services/documentosClinicos";
import type { DocumentoClinico, DocumentoTipo } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Consentimientos y protocolos — Schreiber Instituto de la Visión" },
      {
        name: "description",
        content:
          "Administrá consentimientos informados y protocolos quirúrgicos listos para imprimir con los datos del paciente.",
      },
      { property: "og:title", content: "Consentimientos y protocolos — Schreiber Instituto de la Visión" },
      {
        property: "og:description",
        content: "Documentos legales y clínicos precargados y editables para imprimir en un clic.",
      },
    ],
  }),
  component: Documentos,
});

const VACIO = { tipo: "consentimiento" as DocumentoTipo, nombre: "", contenido: "" };
type Form = typeof VACIO & { id?: string };

function Documentos() {
  const qc = useQueryClient();
  const documentos = useQuery({ queryKey: ["documentos-clinicos"], queryFn: listDocumentos });
  const [form, setForm] = useState<Form | null>(null);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!form) return;
      if (!form.nombre.trim() || !form.contenido.trim()) throw new Error("Completá nombre y contenido");
      await upsertDocumento({
        ...(form.id ? { id: form.id } : {}),
        tipo: form.tipo,
        nombre: form.nombre.trim(),
        contenido: form.contenido.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Documento guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["documentos-clinicos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const borrar = useMutation({
    mutationFn: (id: string) => deleteDocumento(id),
    onSuccess: () => {
      toast.success("Documento eliminado");
      void qc.invalidateQueries({ queryKey: ["documentos-clinicos"] });
    },
    onError: () => toast.error("No se pudo eliminar"),
  });

  const porTipo = (tipo: DocumentoTipo): DocumentoClinico[] =>
    (documentos.data ?? []).filter((d) => d.tipo === tipo);

  return (
    <div>
      <PageHeader
        title="Consentimientos y protocolos"
        description="Documentos legales y clínicos editables. Los marcadores [NOMBRE_PACIENTE], [DNI_PACIENTE], [FECHA] y [MATRICULA_MEDICO] se completan solos al imprimir desde Consulta."
        actions={
          <Button size="sm" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nuevo documento
          </Button>
        }
      />

      {form ? (
        <div className="panel mb-4 grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as DocumentoTipo })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DOCUMENTO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              rows={14}
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

      <div className="space-y-6">
        {TIPOS_DOCUMENTO.map((t) => {
          const items = porTipo(t.value);
          return (
            <section key={t.value} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.label}</h2>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
              ) : null}
              <div className="grid gap-3">
                {items.map((d) => (
                  <article key={d.id} className="panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium">{d.nombre}</h3>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar"
                          onClick={() =>
                            setForm({
                              id: d.id,
                              tipo: d.tipo as DocumentoTipo,
                              nombre: d.nombre,
                              contenido: d.contenido,
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar"
                          onClick={() => borrar.mutate(d.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
                      {d.contenido}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
