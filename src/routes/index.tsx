import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, ShieldCheck, Mic, Wallet, CalendarDays, ScanLine, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Schreiber Instituto de la Visión — Historia clínica y gestión de consultorio" },
      {
        name: "description",
        content:
          "Sistema oftalmológico integral: agenda de turnos, historia clínica con dictado por IA, caja diaria y recetas en PDF. Funciona sin conexión.",
      },
      { property: "og:title", content: "Schreiber Instituto de la Visión — Historia clínica digital" },
      {
        property: "og:description",
        content:
          "Agenda, historia clínica oftalmológica, dictado inteligente, importación de fichas antiguas y control de caja en una sola app instalable.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: CalendarDays, title: "Agenda de turnos", text: "Estados en vivo: pendiente, en espera, en consulta y atendido." },
  { icon: Mic, title: "Dictado inteligente", text: "Dictás desordenado y la IA ordena cada campo de la historia clínica." },
  { icon: ScanLine, title: "Importación con IA", text: "Subís fichas viejas en PDF o foto y obtenés un borrador editable." },
  { icon: Wallet, title: "Caja y liquidación", text: "Copagos, bonos y coseguros con arqueo diario por medio de pago." },
  { icon: ShieldCheck, title: "Roles y permisos", text: "Médico con acceso total y secretaría acotada a agenda y cobros." },
  { icon: WifiOff, title: "Modo offline", text: "Datos en el dispositivo y sincronización automática al volver la red." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Eye className="size-5" />
          </span>
          <span className="text-sm font-semibold">Schreiber Instituto de la Visión</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Ingresar</Link>
        </Button>
      </header>

      <section className="surface-grid border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
          <p className="mb-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            PWA médica · instalable en escritorio y móvil
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.08] sm:text-6xl">
            La consulta oftalmológica, <span className="text-gradient-brand">ordenada por vos</span> y escrita por la IA
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Historia clínica estructurada, agenda, caja diaria y recetas en un solo lugar. Dictá como hablás: el sistema
            distribuye cada dato en su campo.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Crear cuenta o ingresar</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="panel p-5">
              <span className="mb-4 grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h2 className="text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          Schreiber Instituto de la Visión · Datos clínicos protegidos con control de acceso por rol.
        </div>
      </footer>
    </div>
  );
}
