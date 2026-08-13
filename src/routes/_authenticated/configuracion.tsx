import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/PageHeader";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useCurrentUser } from "@/features/auth/useAuth";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Riz Oftalmología" },
      { name: "description", content: "Perfil profesional, rol asignado y tema visual de la aplicación clínica." },
      { property: "og:title", content: "Configuración — Riz Oftalmología" },
      { property: "og:description", content: "Ajustes de cuenta, permisos y apariencia del consultorio digital." },
    ],
  }),
  component: Configuracion,
});

function Configuracion() {
  const { profile, roles, user } = useCurrentUser();

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
    </div>
  );
}
