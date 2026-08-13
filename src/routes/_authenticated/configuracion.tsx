import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/features/auth/useAuth";
import { crearUsuarioPersonal, listarPersonal } from "@/lib/staff.functions";
import type { AppRole } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Digital Eye" },
      { name: "description", content: "Perfil profesional, rol asignado y tema visual de la aplicación clínica." },
      { property: "og:title", content: "Configuración — Digital Eye" },
      { property: "og:description", content: "Ajustes de cuenta, permisos y apariencia del consultorio digital." },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { profile, roles, user, isMedico } = useCurrentUser();

  return (
    <div>
      <PageHeader title="Configuración" description="Datos de la cuenta y apariencia de la aplicación." />

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Cuenta</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-24 text-muted-foreground">Nombre</dt>
              <dd>{profile?.nombre_completo ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 text-muted-foreground">Email</dt>
              <dd className="break-all">{user?.email ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 text-muted-foreground">Matrícula</dt>
              <dd>{profile?.matricula ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 text-muted-foreground">Roles</dt>
              <dd>{roles.length ? roles.join(", ") : "sin rol asignado"}</dd>
            </div>
          </dl>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Tema visual</h2>
          <p className="mt-1 text-xs text-muted-foreground">Día, Noche, Neón, Azul Médico y Sepia.</p>
          <div className="mt-4">
            <ThemeSwitcher />
          </div>
        </section>
      </div>

      {isMedico ? <PersonalPanel /> : null}
    </div>
  );
}

function PersonalPanel() {
  const queryClient = useQueryClient();
  const crear = useServerFn(crearUsuarioPersonal);
  const listar = useServerFn(listarPersonal);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [role, setRole] = useState<AppRole>("secretaria");

  const personal = useQuery({ queryKey: ["personal"], queryFn: () => listar({}) });

  const mutation = useMutation({
    mutationFn: () => crear({ data: { email, password, nombre_completo: nombre, role } }),
    onSuccess: () => {
      toast.success("Cuenta creada. Ya puede ingresar con ese email y contraseña.");
      setEmail("");
      setPassword("");
      setNombre("");
      void queryClient.invalidateQueries({ queryKey: ["personal"] });
    },
    onError: (error: Error) => toast.error(error.message || "No se pudo crear la cuenta"),
  });

  return (
    <section className="panel mt-4 max-w-3xl p-5">
      <h2 className="text-sm font-semibold">Personal del consultorio</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        El registro público está cerrado: creá vos las cuentas de médicos y secretaría.
      </p>

      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="p-nombre">Nombre y apellido</Label>
          <Input id="p-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={3} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-rol">Rol</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger id="p-rol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="medico">Médico</SelectItem>
              <SelectItem value="secretaria">Secretaria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-pass">Contraseña inicial</Label>
          <Input id="p-pass" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
          </Button>
        </div>
      </form>

      <ul className="mt-5 divide-y text-sm">
        {(personal.data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2">
            <span>{p.nombre_completo || "Sin nombre"}</span>
            <span className="text-xs text-muted-foreground">{p.roles.join(", ") || "sin rol"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
