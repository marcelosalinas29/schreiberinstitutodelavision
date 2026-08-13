import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPaciente, listPacientes } from "@/services/pacientes";
import { listHistoriasPaciente } from "@/services/historias";
import type { Paciente } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes — Riz Oftalmología" },
      { name: "description", content: "Buscá, registrá y consultá la ficha completa de cada paciente del consultorio." },
      { property: "og:title", content: "Pacientes — Riz Oftalmología" },
      { property: "og:description", content: "Padrón de pacientes con datos de contacto, obra social e historial de consultas." },
    ],
  }),
  component: Pacientes,
});

const pacienteSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá el nombre").max(80),
  apellido: z.string().trim().min(2, "Ingresá el apellido").max(80),
  dni: z.string().trim().max(20).optional(),
  fecha_nacimiento: z.string().optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.string().trim().max(255).optional(),
  direccion: z.string().trim().max(200).optional(),
  obra_social: z.string().trim().max(120).optional(),
  nro_afiliado: z.string().trim().max(60).optional(),
  notas: z.string().trim().max(2000).optional(),
});

const VACIO = {
  nombre: "",
  apellido: "",
  dni: "",
  fecha_nacimiento: "",
  telefono: "",
  email: "",
  direccion: "",
  obra_social: "",
  nro_afiliado: "",
  notas: "",
};

function Pacientes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);

  const pacientes = useQuery({ queryKey: ["pacientes", search], queryFn: () => listPacientes(search) });
  const historias = useQuery({
    queryKey: ["historias", seleccionado?.id],
    enabled: Boolean(seleccionado?.id),
    queryFn: () => listHistoriasPaciente(seleccionado!.id),
  });

  const crear = useMutation({
    mutationFn: async () => {
      const parsed = pacienteSchema.parse(form);
      await createPaciente({
        nombre: parsed.nombre,
        apellido: parsed.apellido,
        dni: parsed.dni || null,
        fecha_nacimiento: parsed.fecha_nacimiento || null,
        telefono: parsed.telefono || null,
        email: parsed.email || null,
        direccion: parsed.direccion || null,
        obra_social: parsed.obra_social || null,
        nro_afiliado: parsed.nro_afiliado || null,
        notas: parsed.notas || null,
      });
    },
    onSuccess: () => {
      toast.success("Paciente registrado");
      setOpen(false);
      setForm(VACIO);
      void qc.invalidateQueries({ queryKey: ["pacientes"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof z.ZodError ? (error.issues[0]?.message ?? "Datos inválidos") : "No se pudo guardar"),
  });

  const campo = (key: keyof typeof VACIO, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Padrón del consultorio con historial clínico asociado."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Nuevo paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo paciente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {campo("apellido", "Apellido")}
                {campo("nombre", "Nombre")}
                {campo("dni", "DNI")}
                {campo("fecha_nacimiento", "Fecha de nacimiento", "date")}
                {campo("telefono", "Teléfono")}
                {campo("email", "Email", "email")}
                {campo("obra_social", "Obra social")}
                {campo("nro_afiliado", "N° de afiliado")}
                <div className="sm:col-span-2">{campo("direccion", "Dirección")}</div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notas">Notas</Label>
                  <Textarea id="notas" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => crear.mutate()} disabled={crear.isPending}>
                  Guardar
                </Button>
              </DialogFooter>
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
              <h2 className="text-lg font-semibold">
                {seleccionado.apellido}, {seleccionado.nombre}
              </h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Dato label="DNI" value={seleccionado.dni} />
                <Dato label="Nacimiento" value={seleccionado.fecha_nacimiento} />
                <Dato label="Teléfono" value={seleccionado.telefono} />
                <Dato label="Email" value={seleccionado.email} />
                <Dato label="Obra social" value={seleccionado.obra_social} />
                <Dato label="Afiliado" value={seleccionado.nro_afiliado} />
                <Dato label="Dirección" value={seleccionado.direccion} />
              </dl>

              <h3 className="mb-2 mt-6 text-sm font-semibold">Consultas</h3>
              {historias.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (historias.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Sin historias clínicas registradas.</p>
              ) : (
                <ul className="space-y-2">
                  {historias.data!.map((h) => (
                    <li key={h.id} className="rounded-lg border border-border p-3">
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
