import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const crearSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  nombre_completo: z.string().trim().min(3).max(120),
  role: z.enum(["medico", "secretaria"]),
});

export const crearUsuarioPersonal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => crearSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: esMedico, error: rolError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "medico",
    });
    if (rolError) throw new Error("No se pudo verificar el rol");
    if (!esMedico) throw new Error("Solo un médico puede crear cuentas del personal");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre_completo: data.nombre_completo, role: data.role },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarPersonal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: esMedico } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "medico",
    });
    if (!esMedico) throw new Error("Solo un médico puede ver el personal");

    const [{ data: perfiles }, { data: roles }] = await Promise.all([
      context.supabase.from("profiles").select("id, nombre_completo"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);

    return (perfiles ?? []).map((p) => ({
      id: p.id,
      nombre_completo: p.nombre_completo,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    }));
  });
