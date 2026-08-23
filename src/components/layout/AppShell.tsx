import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  Users,
  Stethoscope,
  Wallet,
  FileText,
  ScanLine,
  ClipboardList,
  Pill,
  FileSignature,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  WifiOff,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { Logo } from "@/components/layout/Logo";
import { ChatWidget } from "@/features/chat/ChatWidget";

import { useCurrentUser } from "@/features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  soloMedico?: boolean;
}

const NAV: NavItem[] = [
  { to: "/panel", label: "Panel", icon: LayoutDashboard },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/consulta", label: "Consulta", icon: Stethoscope, soloMedico: true },
  { to: "/importar", label: "Importar fichas", icon: ScanLine, soloMedico: true },
  { to: "/caja", label: "Caja", icon: Wallet },
  { to: "/plantillas", label: "Plantillas", icon: FileText, soloMedico: true },
  { to: "/practicas", label: "Prácticas y estudios", icon: ClipboardList, soloMedico: true },
  { to: "/medicamentos", label: "Medicamentos", icon: Pill, soloMedico: true },
  { to: "/documentos", label: "Consentimientos y protocolos", icon: FileSignature, soloMedico: true },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

function NavLinks({ isMedico, onNavigate }: { isMedico: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      {NAV.filter((item) => !item.soloMedico || isMedico).map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return <Logo size="sm" className="[&_span]:text-sidebar-foreground" />;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, isMedico, roles } = useCurrentUser();
  const navigate = useNavigate();
  const online = useOnline();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <NavLinks isMedico={isMedico} />
        <div className="mt-auto space-y-3">
          <div className="rounded-lg bg-sidebar-accent/60 p-3">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {profile?.nombre_completo || "Usuario"}
            </p>
            <p className="text-xs capitalize text-sidebar-foreground/60">{roles.join(", ") || "sin rol"}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <div className="mb-6">
                <Brand />
              </div>
              <NavLinks isMedico={isMedico} onNavigate={() => setMobileOpen(false)} />
              <Button variant="ghost" size="sm" className="mt-6 w-full justify-start gap-2" onClick={signOut}>
                <LogOut className="size-4" /> Cerrar sesión
              </Button>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />
          {!online ? (
            <Badge variant="outline" className="gap-1.5 border-warning text-warning">
              <WifiOff className="size-3.5" /> Sin conexión
            </Badge>
          ) : null}
          <ThemeSwitcher />
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
      <ChatWidget />

    </div>
  );
}
