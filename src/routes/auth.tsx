import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import type { AppRole } from "@/types/domain";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — Riz Oftalmología" },
      { name: "description", content: "Acceso al sistema de gestión clínica de Riz Oftalmología para médicos y secretaría." },
      { property: "og:title", content: "Ingresar — Riz Oftalmología" },
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

const registroSchema = credencialesSchema.extend({
  nombre_completo: z.string().trim().min(3, "Ingresá nombre y apellido").max(120),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [role, setRole] = useState<AppRole>("medico");

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

  const registrar = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = registroSchema.safeParse({ email, password, nombre_completo: nombre });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/panel`,
        data: { nombre_completo: parsed.data.nombre_completo, role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already registered") ? "Ese email ya está registrado" : error.message);
      return;
    }
    toast.success("Cuenta creada. Revisá tu email si se solicita confirmación.");
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
    <div className="surface-grid flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeSwitcher />
      </div>
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Eye className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Riz Oftalmología</h1>
            <p className="text-xs text-muted-foreground">Acceso al consultorio digital</p>
          </div>
        </div>

        <Tabs defaultValue="ingresar">
          <TabsList className="mb-5 grid w-full grid-cols-2">
            <TabsTrigger value="ingresar">Ingresar</TabsTrigger>
            <TabsTrigger value="registrar">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="ingresar">
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
          </TabsContent>

          <TabsContent value="registrar">
            <form onSubmit={registrar} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre y apellido</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rol">Rol</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger id="rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="secretaria">Secretaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-registro">Email</Label>
                <Input
                  id="email-registro"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password-registro">Contraseña</Label>
                <Input
                  id="password-registro"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

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
