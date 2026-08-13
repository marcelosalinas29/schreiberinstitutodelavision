import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dictadoSchema = z.object({
  transcripcion: z.string().trim().min(5, "El dictado es demasiado corto").max(20000),
});

const documentoSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  dataUrl: z.string().min(20).max(12_000_000),
});

export const parseDictado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => dictadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: esMedico } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "medico",
    });
    if (!esMedico) throw new Error("Solo el médico puede usar el dictado clínico.");

    const { parseDictadoOftalmologico } = await import("./ai.server");
    return parseDictadoOftalmologico(data.transcripcion);
  });

export const parseDocumento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => documentoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: esMedico } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "medico",
    });
    if (!esMedico) throw new Error("Solo el médico puede importar historias clínicas.");

    const { parseDocumentoClinico } = await import("./ai.server");
    return parseDocumentoClinico(data);
  });
