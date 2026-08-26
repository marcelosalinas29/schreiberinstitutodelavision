import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actualizarMiPerfil, getMiPerfil, subirAssetPerfil, urlFirmadaAsset } from "@/services/perfil";

const VACIO = {
  nombre_completo: "",
  especialidad: "",
  matricula: "",
  matricula_nacional: "",
  telefono: "",
  email: "",
};

function AssetUploader({
  label,
  descripcion,
  preview,
  redondo,
  onFile,
  subiendo,
  onEliminar,
}: {
  label: string;
  descripcion: string;
  preview: string | null;
  redondo?: boolean;
  onFile: (file: File) => void;
  subiendo: boolean;
  onEliminar?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-border bg-muted ${
            redondo ? "rounded-full" : "rounded-lg"
          }`}
        >
          {preview ? (
            <img src={preview} alt={label} className="size-full object-contain" />
          ) : (
            <UserRound className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1">
          <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => input.current?.click()}>
            {subiendo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Subir imagen
          </Button>
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function MedicoProfileForm() {
  const qc = useQueryClient();
  const perfil = useQuery({ queryKey: ["mi-perfil"], queryFn: getMiPerfil });
  const [form, setForm] = useState(VACIO);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<"avatar" | "firma" | null>(null);

  const data = perfil.data;

  useEffect(() => {
    if (!data) return;
    setForm({
      nombre_completo: data.nombre_completo ?? "",
      especialidad: data.especialidad ?? "",
      matricula: data.matricula ?? "",
      matricula_nacional: data.matricula_nacional ?? "",
      telefono: data.telefono ?? "",
      email: data.email ?? "",
    });
    void urlFirmadaAsset(data.avatar_url).then(setAvatarPreview);
    void urlFirmadaAsset(data.firma_sello_url).then(setFirmaPreview);
  }, [data]);

  const guardar = useMutation({
    mutationFn: () =>
      actualizarMiPerfil({
        nombre_completo: form.nombre_completo,
        especialidad: form.especialidad || null,
        matricula: form.matricula || null,
        matricula_nacional: form.matricula_nacional || null,
        telefono: form.telefono || null,
        email: form.email || null,
      }),
    onSuccess: () => {
      toast.success("Perfil actualizado");
      void qc.invalidateQueries({ queryKey: ["mi-perfil"] });
      void qc.invalidateQueries({ queryKey: ["current-user"] });
      void qc.invalidateQueries({ queryKey: ["medico-receta"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo guardar el perfil"),
  });

  const subir = async (file: File, tipo: "avatar" | "firma") => {
    setSubiendo(tipo);
    try {
      const path = await subirAssetPerfil(file, tipo);
      await actualizarMiPerfil(tipo === "avatar" ? { avatar_url: path } : { firma_sello_url: path });
      const url = await urlFirmadaAsset(path);
      if (tipo === "avatar") setAvatarPreview(url);
      else setFirmaPreview(url);
      toast.success(tipo === "avatar" ? "Foto actualizada" : "Firma / sello actualizado");
      void qc.invalidateQueries({ queryKey: ["mi-perfil"] });
      void qc.invalidateQueries({ queryKey: ["medico-receta"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(null);
    }
  };

  const campo = (key: keyof typeof VACIO, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`perfil-${key}`}>{label}</Label>
      <Input
        id={`perfil-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <section className="panel mt-4 max-w-3xl p-5">
      <h2 className="text-sm font-semibold">Perfil profesional</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Estos datos y la firma/sello se inyectan automáticamente en las recetas e informes en PDF.
      </p>

      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar.mutate();
        }}
      >
        {campo("nombre_completo", "Nombre completo")}
        {campo("especialidad", "Especialidad")}
        {campo("matricula", "Matrícula provincial (M.P.)")}
        {campo("matricula_nacional", "Matrícula nacional (M.N.)")}
        {campo("telefono", "Teléfono")}
        {campo("email", "Email de contacto", "email")}

        <AssetUploader
          label="Foto de perfil"
          descripcion="PNG o JPG, cuadrada."
          preview={avatarPreview}
          redondo
          subiendo={subiendo === "avatar"}
          onFile={(f) => void subir(f, "avatar")}
        />
        <AssetUploader
          label="Firma y sello digital"
          descripcion="PNG con fondo transparente para mejor impresión."
          preview={firmaPreview}
          subiendo={subiendo === "firma"}
          onFile={(f) => void subir(f, "firma")}
        />

        <div className="sm:col-span-2">
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar perfil
          </Button>
        </div>
      </form>
    </section>
  );
}
