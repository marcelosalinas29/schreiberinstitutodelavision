import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buscarPacientePorDni, createPaciente, updatePaciente } from "@/services/pacientes";
import type { Paciente } from "@/types/domain";

export const pacienteSchema = z.object({
  dni: z.string().trim().min(4, "El DNI / ID es obligatorio").max(20),
  nombre: z.string().trim().min(2, "Ingresá el nombre").max(80),
  apellido: z.string().trim().min(2, "Ingresá el apellido").max(80),
  fecha_nacimiento: z.string().optional(),
  sexo: z.string().trim().max(20).optional(),
  telefono: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Email inválido").max(255)]).optional(),
  obra_social: z.string().trim().max(120).optional(),
  nro_afiliado: z.string().trim().max(60).optional(),
  plan_obra_social: z.string().trim().max(80).optional(),
  condicion_iva: z.string().trim().max(60).optional(),
  direccion: z.string().trim().max(200).optional(),
  localidad: z.string().trim().max(120).optional(),
  notas: z.string().trim().max(2000).optional(),
});

const VACIO = {
  dni: "",
  nombre: "",
  apellido: "",
  fecha_nacimiento: "",
  sexo: "",
  telefono: "",
  email: "",
  obra_social: "",
  nro_afiliado: "",
  plan_obra_social: "",
  condicion_iva: "",
  direccion: "",
  localidad: "",
  notas: "",
};

type Campos = typeof VACIO;

/** Devuelve la edad en años, meses o días según corresponda. */
export function calcularEdad(fechaISO: string): string | null {
  if (!fechaISO) return null;
  const nacimiento = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  if (nacimiento > hoy) return null;

  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  let meses = hoy.getMonth() - nacimiento.getMonth();
  let dias = hoy.getDate() - nacimiento.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  if (anios >= 1) return anios === 1 ? "1 año" : `${anios} años`;
  if (meses >= 1) return meses === 1 ? "1 mes" : `${meses} meses`;
  const totalDias = Math.floor((hoy.getTime() - nacimiento.getTime()) / 86_400_000);
  return totalDias === 1 ? "1 día" : `${totalDias} días`;
}

function desdePaciente(p?: Paciente | null): Campos {
  if (!p) return VACIO;
  return {
    dni: p.dni ?? "",
    nombre: p.nombre ?? "",
    apellido: p.apellido ?? "",
    fecha_nacimiento: p.fecha_nacimiento ?? "",
    sexo: p.sexo ?? "",
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    obra_social: p.obra_social ?? "",
    nro_afiliado: p.nro_afiliado ?? "",
    plan_obra_social: p.plan_obra_social ?? p.plan ?? "",
    condicion_iva: p.condicion_iva ?? "",
    direccion: p.direccion ?? "",
    localidad: p.localidad ?? "",
    notas: p.notas ?? "",
  };
}

export interface PatientFormProps {
  paciente?: Paciente | null;
  /** Valores iniciales opcionales (por ejemplo el DNI tipeado en el buscador de la agenda). */
  defaults?: Partial<Campos>;
  onSaved: (paciente: Paciente) => void;
  /** Se invoca al tocar "Abrir ficha existente" en la alerta de duplicado. */
  onAbrirExistente?: (paciente: Paciente) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function PatientForm({ paciente, defaults, onSaved, onAbrirExistente, onCancel, submitLabel }: PatientFormProps) {
  const [form, setForm] = useState<Campos>(() => ({ ...desdePaciente(paciente), ...defaults }));
  const [consent, setConsent] = useState({
    recordatorios: paciente?.consiente_recordatorios ?? true,
    recetas: paciente?.consiente_recetas ?? true,
    administrativo: paciente?.consiente_administrativo ?? false,
  });
  const [duplicado, setDuplicado] = useState<Paciente | null>(null);

  const edad = useMemo(() => calcularEdad(form.fecha_nacimiento), [form.fecha_nacimiento]);
  const set = (key: keyof Campos, value: string) => setForm((f) => ({ ...f, [key]: value }));

  // Validación de duplicados por DNI (con debounce mientras se escribe).
  useEffect(() => {
    const dni = form.dni.trim();
    if (dni.length < 4) {
      setDuplicado(null);
      return;
    }
    let cancelado = false;
    const timer = setTimeout(async () => {
      try {
        const existente = await buscarPacientePorDni(dni);
        if (cancelado) return;
        setDuplicado(existente && existente.id !== paciente?.id ? existente : null);
      } catch {
        /* silencioso: la validación dura ocurre al guardar */
      }
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [form.dni, paciente?.id]);

  const guardar = useMutation({
    mutationFn: async () => {
      const parsed = pacienteSchema.parse(form);
      const values = {
        dni: parsed.dni,
        nombre: parsed.nombre,
        apellido: parsed.apellido,
        fecha_nacimiento: parsed.fecha_nacimiento || null,
        sexo: parsed.sexo || null,
        telefono: parsed.telefono || null,
        email: parsed.email || null,
        obra_social: parsed.obra_social || null,
        nro_afiliado: parsed.nro_afiliado || null,
        plan_obra_social: parsed.plan_obra_social || null,
        condicion_iva: parsed.condicion_iva || null,
        direccion: parsed.direccion || null,
        localidad: parsed.localidad || null,
        notas: parsed.notas || null,
        consiente_recordatorios: consent.recordatorios,
        consiente_recetas: consent.recetas,
        consiente_administrativo: consent.administrativo,
      };
      return paciente ? updatePaciente(paciente.id, values) : createPaciente(values);
    },
    onSuccess: (p) => {
      toast.success(paciente ? "Paciente actualizado" : "Paciente registrado");
      onSaved(p);
    },
    onError: (error: unknown) => {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? "Datos inválidos");
        return;
      }
      const msg = (error as { message?: string })?.message ?? "";
      toast.error(msg.includes("pacientes_dni_unique") ? "Ya existe un paciente con ese DNI / ID" : "No se pudo guardar");
    },
  });

  const campo = (key: keyof Campos, label: string, type = "text", extra?: React.ReactNode) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`pf-${key}`}>{label}</Label>
        {extra}
      </div>
      <Input id={`pf-${key}`} type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2">
        {campo("dni", "DNI / ID *")}
        {campo(
          "fecha_nacimiento",
          "Fecha de nacimiento",
          "date",
          edad ? <Badge variant="secondary">{edad}</Badge> : null,
        )}
        {campo("apellido", "Apellido *")}
        {campo("nombre", "Nombre *")}
      </section>

      {duplicado ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <span className="min-w-0 flex-1">
            Ya existe un paciente con el DNI {duplicado.dni}: <strong>{duplicado.apellido}, {duplicado.nombre}</strong>.
          </span>
          {onAbrirExistente ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onAbrirExistente(duplicado)}>
              Abrir ficha existente
            </Button>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Comunicación</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {campo("telefono", "Teléfono (WhatsApp / SMS)", "tel")}
          {campo("email", "Email", "email")}
        </div>
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Consentimiento
            id="c-recordatorios"
            label="Recordatorios de turno"
            checked={consent.recordatorios}
            onChange={(v) => setConsent((c) => ({ ...c, recordatorios: v }))}
          />
          <Consentimiento
            id="c-recetas"
            label="Envío de recetas / informes"
            checked={consent.recetas}
            onChange={(v) => setConsent((c) => ({ ...c, recetas: v }))}
          />
          <Consentimiento
            id="c-admin"
            label="Avisos administrativos"
            checked={consent.administrativo}
            onChange={(v) => setConsent((c) => ({ ...c, administrativo: v }))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Cobertura y datos complementarios</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {campo("obra_social", "Obra social / Prepaga")}
          {campo("nro_afiliado", "N° de afiliado")}
          {campo("plan_obra_social", "Plan")}
          <div className="space-y-1.5">
            <Label>Sexo</Label>
            <div className="flex gap-2">
              {["Masculino", "Femenino", "Otro"].map((opcion) => (
                <Button
                  key={opcion}
                  type="button"
                  size="sm"
                  variant={form.sexo === opcion ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => set("sexo", form.sexo === opcion ? "" : opcion)}
                >
                  {opcion}
                </Button>
              ))}
            </div>
          </div>
          {campo("direccion", "Dirección")}
          {campo("localidad", "Localidad")}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-notas">Notas / Observaciones</Label>
          <Textarea id="pf-notas" rows={2} value={form.notas} onChange={(e) => set("notas", e.target.value)} />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button onClick={() => guardar.mutate()} disabled={guardar.isPending || Boolean(duplicado)}>
          {submitLabel ?? (paciente ? "Guardar cambios" : "Guardar paciente")}
        </Button>
      </div>
    </div>
  );
}

function Consentimiento({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
