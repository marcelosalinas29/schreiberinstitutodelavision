import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generarRecetaPDF } from "@/lib/pdf";
import { listPlantillas, upsertPlantilla } from "@/services/plantillas";

export const Route = createFileRoute("/_authenticated/plantillas")({
  head: () => ({
    meta: [
      { title: "Plantilla de recetas — Riz Oftalmología" },
      { name: "description", content: "Configurá el membrete, los datos del profesional y el pie de página de las recetas en PDF." },
      { property: "og:title", content: "Plantilla de recetas — Riz Oftalmología" },
      { property: "og:description", content: "Membrete institucional, matrícula y firma para recetas e indicaciones." },
    ],
  }),
  component: Plantillas,
});

const VACIO = {
  nombre: "Receta estándar",
  institucion: "Riz Oftalmología",
  profesional: "",
  matricula: "",
  direccion: "",
  telefono: "",
  pie_pagina: "",
};

function Plantillas() {
  const qc = useQueryClient();
  const plantillas = useQuery({ queryKey: ["plantillas"], queryFn: listPlantillas });
  const actual = plantillas.data?.[0] ?? null;
  const [form, setForm] = useState(VACIO);

  useEffect(() => {
    if (!actual) return;
    setForm({
      nombre: actual.nombre,
      institucion: actual.institucion ?? "",
      profesional: actual.profesional ?? "",
      matricula: actual.matricula ?? "",
      direccion: actual.direccion ?? "",
      telefono: actual.telefono ?? "",
      pie_pagina: actual.pie_pagina ?? "",
    });
  }, [actual]);

  const guardar = useMutation({
    mutationFn: () =>
      upsertPlantilla({
        ...(actual ? { id: actual.id } : {}),
        nombre: form.nombre || "Receta estándar",
        institucion: form.institucion || null,
        profesional: form.profesional || null,
        matricula: form.matricula || null,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        pie_pagina: form.pie_pagina || null,
      }),
    onSuccess: () => {
      toast.success("Plantilla guardada");
      void qc.invalidateQueries({ queryKey: ["plantillas"] });
    },
    onError: () => toast.error("No se pudo guardar la plantilla"),
  });

  const campo = (key: keyof typeof VACIO, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Plantillas"
        description="Membrete y firma que se aplican a recetas e indicaciones en PDF."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                generarRecetaPDF({
                  paciente: { nombre: "Ejemplo", apellido: "Paciente", dni: "00000000", obra_social: null, nro_afiliado: null },
                  contenido: "Lágrimas artificiales 1 gota cada 6 hs por 15 días.",
                  fecha: new Date(),
                  plantilla: actual,
                })
              }
            >
              Vista previa PDF
            </Button>
            <Button size="sm" onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              <Save className="size-4" /> Guardar
            </Button>
          </>
        }
      />

      <div className="panel grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
        {campo("nombre", "Nombre de la plantilla")}
        {campo("institucion", "Institución / consultorio")}
        {campo("profesional", "Profesional")}
        {campo("matricula", "Matrícula")}
        {campo("telefono", "Teléfono")}
        {campo("direccion", "Dirección")}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="pie">Pie de página</Label>
          <Textarea id="pie" rows={2} value={form.pie_pagina} onChange={(e) => setForm({ ...form, pie_pagina: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
