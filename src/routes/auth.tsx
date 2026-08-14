import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoWordmark } from "@/components/layout/Logo";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Schreiber Instituto de la Visión" },
      { name: "description", content: "Acceso al sistema de gestión clínica de Schreiber Instituto de la Visión para médicos y secretaría." },
      { property: "og:title", content: "Ingresar — Schreiber Instituto de la Visión" },
      { property: "og:description", content: "Acceso seguro al consultorio digital: agenda, historia clínica y caja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credencialesSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/panel" });
    });
  }, [navigate]);

  const ingresar = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = credencialesSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email o contraseña incorrectos" : error.message);
      return;
    }
    void navigate({ to: "/panel" });
  };

  const conGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("No se pudo iniciar sesión con Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/panel" });
  };

  return (
    <div className="bg-watermark-full flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoWordmark transparente className="h-auto w-full max-w-[280px]" />
          <h1 className="sr-only">Schreiber Instituto de la Visión</h1>
          <p className="mt-2 text-xs text-muted-foreground">Acceso al consultorio digital</p>
        </div>

        <form onSubmit={ingresar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Ingresar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          El registro está cerrado. Las cuentas del personal las crea el médico responsable desde Configuración.
        </p>


        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={conGoogle} disabled={loading}>
          Continuar con Google
        </Button>
      </div>
    </div>
  );
}
