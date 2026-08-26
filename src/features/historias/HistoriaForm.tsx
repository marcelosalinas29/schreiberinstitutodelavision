import { useEffect, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { HistoriaClinicaInsert } from "@/types/domain";
import { MedicamentoPicker } from "@/features/historias/MedicamentoPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  subirImagenHistoria,
  urlFirmadaImagenHistoria,
  type ImagenHistoriaTipo,
} from "@/services/historias";

export type HistoriaDraft = Omit<HistoriaClinicaInsert, "paciente_id">;

export const HISTORIA_VACIA: HistoriaDraft = {
  fecha: new Date().toISOString().slice(0, 10),
  motivo_consulta: "",
  antecedentes_personales: "",
  antecedentes_familiares: "",
  antecedentes_oftalmologicos: "",
  arm_od: "",
  arm_oi: "",
  refraccion_od: "",
  refraccion_oi: "",
  av_sc_od: "",
  av_sc_oi: "",
  av_cc_od: "",
  av_cc_oi: "",
  bmc_od: "",
  bmc_oi: "",
  pio_od: null,
  pio_oi: null,
  pio_hora: "",
  fo_od: "",
  fo_oi: "",
  examen_ocular_obs: "",
  fo_od_imagen_url: null,
  fo_oi_imagen_url: null,
  cv_od_imagen_url: null,
  cv_oi_imagen_url: null,
  diagnostico: "",
  cie10: "",
  tratamiento: "",
  proxima_cita: "",
};

interface Props {
  value: HistoriaDraft;
  onChange: (patch: Partial<HistoriaDraft>) => void;
  historiaId?: string | undefined;
}

const COLUMNA_IMAGEN = {
  fo_od: "fo_od_imagen_url",
  fo_oi: "fo_oi_imagen_url",
  cv_od: "cv_od_imagen_url",
  cv_oi: "cv_oi_imagen_url",
} as const satisfies Record<ImagenHistoriaTipo, keyof HistoriaDraft>;

function AdjuntoEstudio({
  label,
  tipo,
  value,
  onChange,
  historiaId,
}: Props & { label: string; tipo: ImagenHistoriaTipo }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const path = (value[COLUMNA_IMAGEN[tipo]] as string | null) ?? null;
  const esPdf = !!path && path.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let vigente = true;
    void urlFirmadaImagenHistoria(path).then((url) => {
      if (vigente) setPreview(url);
    });
    return () => {
      vigente = false;
    };
  }, [path]);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const nuevaRuta = await subirImagenHistoria(file, historiaId ?? "nueva", tipo);
      onChange({ [COLUMNA_IMAGEN[tipo]]: nuevaRuta } as Partial<HistoriaDraft>);
      toast.success(`${label}: archivo adjuntado`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {preview && !esPdf ? (
          <img src={preview} alt={label} className="size-full object-cover" />
        ) : preview && esPdf ? (
          <FileText className="size-6 text-muted-foreground" />
        ) : (
          <ImagePlus className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" disabled={subiendo} onClick={() => input.current?.click()}>
          {subiendo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {path ? "Reemplazar" : "Adjuntar"} {label}
        </Button>
        {preview ? (
          <a href={preview} target="_blank" rel="noreferrer" className="block text-xs text-primary underline">
            Ver archivo adjunto
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">JPG, PNG o PDF</p>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void subir(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}


function Bilateral({
  label,
  odKey,
  oiKey,
  value,
  onChange,
  placeholder,
}: Props & { label: string; odKey: keyof HistoriaDraft; oiKey: keyof HistoriaDraft; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input
          aria-label={`${label} ojo derecho`}
          placeholder={placeholder ? `OD ${placeholder}` : "OD"}
          value={(value[odKey] as string) ?? ""}
          onChange={(e) => onChange({ [odKey]: e.target.value } as Partial<HistoriaDraft>)}
        />
        <Input
          aria-label={`${label} ojo izquierdo`}
          placeholder={placeholder ? `OI ${placeholder}` : "OI"}
          value={(value[oiKey] as string) ?? ""}
          onChange={(e) => onChange({ [oiKey]: e.target.value } as Partial<HistoriaDraft>)}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function HistoriaForm({ value, onChange, historiaId }: Props) {
  const props = { value, onChange, historiaId };


  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Anamnesis">
        <div className="space-y-1.5">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            type="date"
            value={value.fecha ?? ""}
            onChange={(e) => onChange({ fecha: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo de consulta</Label>
          <Textarea id="motivo" rows={3} value={value.motivo_consulta ?? ""} onChange={(e) => onChange({ motivo_consulta: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ap">Antecedentes personales</Label>
          <Textarea id="ap" rows={2} value={value.antecedentes_personales ?? ""} onChange={(e) => onChange({ antecedentes_personales: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af">Antecedentes familiares</Label>
          <Textarea id="af" rows={2} value={value.antecedentes_familiares ?? ""} onChange={(e) => onChange({ antecedentes_familiares: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ao">Antecedentes oftalmológicos</Label>
          <Textarea id="ao" rows={2} value={value.antecedentes_oftalmologicos ?? ""} onChange={(e) => onChange({ antecedentes_oftalmologicos: e.target.value })} />
        </div>
      </Section>

      <Section title="Examen oftalmológico">
        <Bilateral {...props} label="Autorrefractómetro (ARM)" odKey="arm_od" oiKey="arm_oi" placeholder="esf / cil x eje" />
        <Bilateral {...props} label="Refracción subjetiva" odKey="refraccion_od" oiKey="refraccion_oi" placeholder="esf / cil x eje" />
        <DatosPrevios
          value={value}
          campos={[
            ["AV sin corrección OD", "av_sc_od"],
            ["AV sin corrección OI", "av_sc_oi"],
            ["AV con corrección OD", "av_cc_od"],
            ["AV con corrección OI", "av_cc_oi"],
          ]}
        />
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">PIO (mmHg)</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="OD"
              aria-label="PIO ojo derecho"
              value={value.pio_od ?? ""}
              onChange={(e) => onChange({ pio_od: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <Input
              type="number"
              step="0.1"
              placeholder="OI"
              aria-label="PIO ojo izquierdo"
              value={value.pio_oi ?? ""}
              onChange={(e) => onChange({ pio_oi: e.target.value === "" ? null : Number(e.target.value) })}
            />
            <Input
              type="time"
              aria-label="Hora de la toma de PIO"
              value={value.pio_hora ?? ""}
              onChange={(e) => onChange({ pio_hora: e.target.value })}
            />
          </div>
        </div>
        <DatosPrevios
          value={value}
          campos={[
            ["Biomicroscopía OD", "bmc_od"],
            ["Biomicroscopía OI", "bmc_oi"],
            ["Fondo de ojo OD", "fo_od"],
            ["Fondo de ojo OI", "fo_oi"],
          ]}
        />
        <div className="space-y-1.5">
          <Label htmlFor="examen-obs">Biomicroscopía, fondo de ojo y otras observaciones</Label>
          <Textarea
            id="examen-obs"
            rows={8}
            placeholder="Biomicroscopía, fondo de ojo y cualquier otra observación del examen…"
            value={value.examen_ocular_obs ?? ""}
            onChange={(e) => onChange({ examen_ocular_obs: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdjuntoEstudio {...props} label="retinografía OD" tipo="fo_od" />
          <AdjuntoEstudio {...props} label="retinografía OI" tipo="fo_oi" />
        </div>
      </Section>

      <Section title="Campo visual">
        <p className="text-xs text-muted-foreground">
          Adjuntá el estudio de campo visual de cada ojo (imagen o PDF exportado del equipo).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdjuntoEstudio {...props} label="campo visual OD" tipo="cv_od" />
          <AdjuntoEstudio {...props} label="campo visual OI" tipo="cv_oi" />
        </div>
      </Section>


      <Section title="Diagnóstico">
        <div className="space-y-1.5">
          <Label htmlFor="dx">Diagnóstico</Label>
          <Textarea id="dx" rows={3} value={value.diagnostico ?? ""} onChange={(e) => onChange({ diagnostico: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cie10">CIE-10</Label>
          <Input id="cie10" placeholder="H52.1" value={value.cie10 ?? ""} onChange={(e) => onChange({ cie10: e.target.value })} />
        </div>
      </Section>

      <Section title="Plan y tratamiento">
        <div className="space-y-1.5">
          <Label htmlFor="tto">Tratamiento / indicaciones</Label>
          <MedicamentoPicker
            onAgregar={(linea) => {
              const actual = (value.tratamiento ?? "").replace(/\s+$/, "");
              onChange({ tratamiento: actual ? `${actual}\n${linea}` : linea });
            }}
          />
          <Textarea id="tto" rows={6} value={value.tratamiento ?? ""} onChange={(e) => onChange({ tratamiento: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proxima">Próxima cita</Label>
          <Input id="proxima" placeholder="Control en 3 meses" value={value.proxima_cita ?? ""} onChange={(e) => onChange({ proxima_cita: e.target.value })} />
        </div>
      </Section>
    </div>
  );
}
