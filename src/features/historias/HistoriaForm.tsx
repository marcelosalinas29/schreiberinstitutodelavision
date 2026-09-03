import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buscarCie10, listCie10 } from "@/services/cie10";
import { ExternalLink, FileText, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { listLinksObrasSociales } from "@/services/linksObrasSociales";
import { listFormatosHistoria } from "@/services/formatosHistoria";

import type { HistoriaClinicaInsert } from "@/types/domain";
import { MedicamentoPicker } from "@/features/historias/MedicamentoPicker";
import { HistoricoPIO } from "@/features/historias/HistoricoPIO";
import { HistoricoRefraccion } from "@/features/historias/HistoricoRefraccion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hoyISO } from "@/lib/fecha";
import {
  urlFirmadaImagenHistoria,
  subirAdjuntoEstudio,
  listAdjuntosEstudio,
  eliminarAdjuntoEstudio,
  type HistoriaAdjunto,
} from "@/services/historias";

export type HistoriaDraft = Omit<HistoriaClinicaInsert, "paciente_id">;

export const HISTORIA_VACIA: HistoriaDraft = {
  fecha: hoyISO(),
  motivo_consulta: "",
  antecedentes_personales: "",
  antecedentes_familiares: "",
  antecedentes_oftalmologicos: "",
  arm_od: "",
  arm_oi: "",
  refraccion_od: "",
  refraccion_oi: "",
  refraccion_cerca_od: "",
  refraccion_cerca_oi: "",
  refraccion_od_esf: "",
  refraccion_od_cil: "",
  refraccion_od_eje: "",
  refraccion_oi_esf: "",
  refraccion_oi_cil: "",
  refraccion_oi_eje: "",
  refraccion_cerca_od_esf: "",
  refraccion_cerca_od_cil: "",
  refraccion_cerca_od_eje: "",
  refraccion_cerca_oi_esf: "",
  refraccion_cerca_oi_cil: "",
  refraccion_cerca_oi_eje: "",
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
  evolucion_clinica: "",
  campo_visual_obs: "",

  fo_od_imagen_url: null,
  fo_oi_imagen_url: null,
  cv_od_imagen_url: null,
  cv_oi_imagen_url: null,
  curva_pio_ayunas_od: null,
  curva_pio_ayunas_oi: null,
  curva_pio_sobrecarga_od: null,
  curva_pio_sobrecarga_oi: null,
  diagnostico: "",
  cie10: "",
  tratamiento: "",
  proxima_cita: "",
};

interface Props {
  value: HistoriaDraft;
  /** Modo solo lectura (secretaria): no puede editar ni subir nada. */
  soloLectura?: boolean;
  onChange: (patch: Partial<HistoriaDraft>) => void;
  historiaId?: string | undefined;
  pacienteId?: string | null | undefined;
}

const COLUMNA_IMAGEN = {
  fo_od: "fo_od_imagen_url",
  fo_oi: "fo_oi_imagen_url",
  cv_od: "cv_od_imagen_url",
  cv_oi: "cv_oi_imagen_url",
} as const;

/** Miniatura de solo lectura de los adjuntos cargados con el formato anterior. */
function AdjuntoPrevio({ label, path }: { label: string; path: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const esPdf = path.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    let vigente = true;
    void urlFirmadaImagenHistoria(path).then((url) => {
      if (vigente) setPreview(url);
    });
    return () => {
      vigente = false;
    };
  }, [path]);
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {preview && !esPdf ? (
          <img src={preview} alt={label} className="size-full object-cover" />
        ) : (
          <FileText className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Adjunto anterior</p>
        <p className="text-sm">{label}</p>
        {preview ? (
          <a href={preview} target="_blank" rel="noreferrer" className="block text-xs text-primary underline">
            Ver archivo
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AdjuntosPrevios({ value }: { value: HistoriaDraft }) {
  const items: [string, string][] = (
    [
      ["Retinografía OD", COLUMNA_IMAGEN.fo_od],
      ["Retinografía OI", COLUMNA_IMAGEN.fo_oi],
      ["Campo visual OD", COLUMNA_IMAGEN.cv_od],
      ["Campo visual OI", COLUMNA_IMAGEN.cv_oi],
    ] as const
  )
    .map(([label, key]) => [label, (value[key] as string | null) ?? ""] as [string, string])
    .filter(([, path]) => path !== "");
  if (items.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, path]) => (
        <AdjuntoPrevio key={path} label={label} path={path} />
      ))}
    </div>
  );
}

/** Control único: adjuntar cualquier cantidad de estudios (imagen o PDF). */
function AdjuntosEstudio({ historiaId, soloLectura }: { historiaId?: string | undefined; soloLectura?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [items, setItems] = useState<HistoriaAdjunto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const recargar = async (id: string) => {
    const filas = await listAdjuntosEstudio(id);
    setItems(filas);
    const pares = await Promise.all(
      filas.map(async (f) => [f.id, (await urlFirmadaImagenHistoria(f.path)) ?? ""] as const),
    );
    setUrls(Object.fromEntries(pares));
  };

  useEffect(() => {
    if (!historiaId) {
      setItems([]);
      return;
    }
    void recargar(historiaId);
  }, [historiaId]);

  const subir = async (files: FileList) => {
    if (!historiaId) return;
    setSubiendo(true);
    try {
      for (const file of Array.from(files)) {
        await subirAdjuntoEstudio(file, historiaId);
      }
      await recargar(historiaId);
      toast.success("Estudio adjuntado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally {
      setSubiendo(false);
    }
  };

  const borrar = async (id: string) => {
    try {
      await eliminarAdjuntoEstudio(id);
      if (historiaId) await recargar(historiaId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el adjunto");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={subiendo || !historiaId || soloLectura}
          onClick={() => input.current?.click()}
        >
          {subiendo ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          Adjuntar estudio
        </Button>
        <p className="text-xs text-muted-foreground">
          {historiaId ? "Imágenes o PDF, podés subir varios." : "Guardá la historia clínica antes de adjuntar."}
        </p>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
              <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {urls[a.id] && !a.path.toLowerCase().endsWith(".pdf") ? (
                  <img src={urls[a.id]} alt={a.nombre_archivo ?? "Adjunto"} className="size-full object-cover" />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{a.nombre_archivo ?? "Archivo adjunto"}</p>
                {urls[a.id] ? (
                  <a href={urls[a.id]} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                    Ver archivo
                  </a>
                ) : null}
              </div>
              {!soloLectura ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void borrar(a.id)}>
                  Eliminar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <input
        ref={input}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void subir(e.target.files);
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

/** Grilla de refracción con casilleros separados Esfera / Cilindro / Eje por ojo. */
function RefraccionGrilla({
  label,
  claves,
  value,
  onChange,
}: Props & {
  label: string;
  claves: { od: [keyof HistoriaDraft, keyof HistoriaDraft, keyof HistoriaDraft]; oi: [keyof HistoriaDraft, keyof HistoriaDraft, keyof HistoriaDraft] };
}) {
  const fila = (ojo: "OD" | "OI", keys: [keyof HistoriaDraft, keyof HistoriaDraft, keyof HistoriaDraft]) => (
    <div className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{ojo}</span>
      {(["Esf", "Cil", "Eje"] as const).map((etiqueta, i) => (
        <Input
          key={etiqueta}
          aria-label={`${label} ${ojo} ${etiqueta}`}
          placeholder={etiqueta}
          value={(value[keys[i]] as string) ?? ""}
          onChange={(e) => onChange({ [keys[i]]: e.target.value } as Partial<HistoriaDraft>)}
        />
      ))}
    </div>
  );
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {fila("OD", claves.od)}
      {fila("OI", claves.oi)}
    </div>
  );
}

/** Muestra, sólo lectura, datos históricos de campos que ya no se editan. */
function DatosPrevios({
  value,
  campos,
}: {
  value: HistoriaDraft;
  campos: [label: string, key: keyof HistoriaDraft][];
}) {
  const cargados = campos.filter(([, key]) => {
    const v = value[key];
    return typeof v === "string" && v.trim() !== "";
  });
  if (cargados.length === 0) return null;
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Datos previos (formato anterior)
      </p>
      <ul className="space-y-0.5 text-sm">
        {cargados.map(([label, key]) => (
          <li key={String(key)}>
            <span className="text-muted-foreground">{label}:</span> {value[key] as string}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Al cargar la primera PIO, completa la hora actual si aún está vacía. */
function patchPio(campo: "pio_od" | "pio_oi", raw: string, value: HistoriaDraft): Partial<HistoriaDraft> {
  const numero = raw === "" ? null : Number(raw);
  const patch: Partial<HistoriaDraft> = { [campo]: numero } as Partial<HistoriaDraft>;
  if (numero !== null && !(value.pio_hora ?? "").trim()) {
    patch.pio_hora = new Date().toTimeString().slice(0, 5);
  }
  return patch;
}

function FormatosChips({ onInsertar }: { onInsertar: (texto: string) => void }) {
  const formatos = useQuery({ queryKey: ["formatos-historia"], queryFn: listFormatosHistoria });
  const items = formatos.data ?? [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {items.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onInsertar(f.contenido)}
          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          {f.nombre}
        </button>
      ))}
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

function LinksObrasSocialesChips({ obraSocial }: { obraSocial?: string | null | undefined }) {
  const links = useQuery({ queryKey: ["links-obras-sociales"], queryFn: listLinksObrasSociales });
  const os = (obraSocial ?? "").trim().toLowerCase();
  const items = [...(links.data ?? [])].sort((a, b) => {
    const ca = a.obra_social.trim().toLowerCase() === os && os !== "" ? 0 : 1;
    const cb = b.obra_social.trim().toLowerCase() === os && os !== "" ? 0 : 1;
    return ca - cb;
  });
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Plataformas de recetas / pedidos online
      </Label>
      <div className="flex flex-wrap gap-2">
        {items.map((l) => {
          const coincide = os !== "" && l.obra_social.trim().toLowerCase() === os;
          return (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${l.nombre_plataforma} — ${l.obra_social}`}
              className={
                coincide
                  ? "inline-flex items-center gap-1 rounded-full border border-primary bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  : "inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              }
            >
              {l.nombre_plataforma}
              <ExternalLink className="size-3" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function HistoriaForm({ value, onChange, historiaId, obraSocial, pacienteId, soloLectura = false }: Props & { obraSocial?: string | null | undefined }) {
  const props = { value, onChange, historiaId };

  const diccionarioCie10 = useQuery({ queryKey: ["cie10"], queryFn: listCie10 });
  const [cie10Sugerido, setCie10Sugerido] = useState<string | null>(null);
  const diagnostico = value.diagnostico ?? "";
  const cie10Actual = value.cie10 ?? "";
  const sugeridoRef = useRef<string | null>(null);
  sugeridoRef.current = cie10Sugerido;

  useEffect(() => {
    const entradas = diccionarioCie10.data;
    if (!entradas || entradas.length === 0) return;
    const t = setTimeout(() => {
      const match = buscarCie10(diagnostico, entradas);
      if (!match) return;
      const puedeCompletar = cie10Actual.trim() === "" || cie10Actual === sugeridoRef.current;
      if (puedeCompletar && cie10Actual !== match.codigo) {
        setCie10Sugerido(match.codigo);
        onChange({ cie10: match.codigo });
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnostico, diccionarioCie10.data, cie10Actual]);




  return (
    <fieldset disabled={soloLectura} className="grid gap-4 lg:grid-cols-2">
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
        <DatosPrevios
          value={value}
          campos={[
            ["Motivo de consulta", "motivo_consulta"],
            ["Antecedentes personales", "antecedentes_personales"],
            ["Antecedentes familiares", "antecedentes_familiares"],
            ["Antecedentes oftalmológicos", "antecedentes_oftalmologicos"],
          ]}
        />

        <div className="space-y-1.5">
          <Label htmlFor="evolucion">Antecedentes y examen</Label>
          <FormatosChips
            onInsertar={(texto) => {
              const actual = (value.evolucion_clinica ?? "").replace(/\s+$/, "");
              onChange({ evolucion_clinica: actual ? `${actual}\n\n${texto}` : texto });
            }}
          />
          <Textarea
            id="evolucion"
            rows={16}
            placeholder="Antecedentes, biomicroscopía, fondo de ojo y observaciones…"
            value={value.evolucion_clinica ?? ""}
            onChange={(e) => onChange({ evolucion_clinica: e.target.value })}
          />
        </div>

      </Section>

      <Section title="Examen oftalmológico">
        <DatosPrevios
          value={value}
          campos={[
            ["Autorrefractómetro (dato previo) OD", "arm_od"],
            ["Autorrefractómetro (dato previo) OI", "arm_oi"],
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <DatosPrevios
              value={value}
              campos={[
                ["Refracción subjetiva OD", "refraccion_od"],
                ["Refracción subjetiva OI", "refraccion_oi"],
                ["Refracción de cerca OD", "refraccion_cerca_od"],
                ["Refracción de cerca OI", "refraccion_cerca_oi"],
              ]}
            />
            <RefraccionGrilla
              {...props}
              label="Refracción subjetiva (lejos)"
              claves={{
                od: ["refraccion_od_esf", "refraccion_od_cil", "refraccion_od_eje"],
                oi: ["refraccion_oi_esf", "refraccion_oi_cil", "refraccion_oi_eje"],
              }}
            />
            <RefraccionGrilla
              {...props}
              label="Refracción de cerca"
              claves={{
                od: ["refraccion_cerca_od_esf", "refraccion_cerca_od_cil", "refraccion_cerca_od_eje"],
                oi: ["refraccion_cerca_oi_esf", "refraccion_cerca_oi_cil", "refraccion_cerca_oi_eje"],
              }}
            />
          </div>
          {pacienteId ? <HistoricoRefraccion pacienteId={pacienteId} /> : null}
        </div>
        <DatosPrevios
          value={value}
          campos={[
            ["AV sin corrección OD", "av_sc_od"],
            ["AV sin corrección OI", "av_sc_oi"],
            ["AV con corrección OD", "av_cc_od"],
            ["AV con corrección OI", "av_cc_oi"],
          ]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">PIO (mmHg)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="OD"
                aria-label="PIO ojo derecho"
                value={value.pio_od ?? ""}
                onChange={(e) => onChange(patchPio("pio_od", e.target.value, value))}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="OI"
                aria-label="PIO ojo izquierdo"
                value={value.pio_oi ?? ""}
                onChange={(e) => onChange(patchPio("pio_oi", e.target.value, value))}
              />
              <Input
                type="time"
                aria-label="Hora de la toma de PIO"
                value={value.pio_hora ?? ""}
                onChange={(e) => onChange({ pio_hora: e.target.value })}
              />
            </div>
          </div>
          {pacienteId ? <HistoricoPIO pacienteId={pacienteId} /> : null}
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
        <DatosPrevios value={value} campos={[["Examen (formato anterior)", "examen_ocular_obs"]]} />

        <AdjuntosPrevios value={value} />
      </Section>

      <Section title="Estudios adjuntos">
        <p className="text-xs text-muted-foreground">
          Adjuntá cualquier estudio (imagen o PDF): retinografía, campo visual, OCT, ecografía, etc.
        </p>
        <AdjuntosEstudio historiaId={historiaId} soloLectura={soloLectura} />
      </Section>

      <Section title="Campo visual">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Descripción del campo visual
          </Label>
          <Textarea
            rows={6}
            placeholder="Describí el campo visual libremente…"
            value={value.campo_visual_obs ?? ""}
            onChange={(e) => onChange({ campo_visual_obs: e.target.value })}
          />
        </div>



        <div className="space-y-3 border-t border-border pt-3">
          <h4 className="text-sm font-semibold">Curva de presión ocular</h4>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">En ayunas (mmHg)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="OD"
                aria-label="Curva de presión en ayunas ojo derecho"
                value={value.curva_pio_ayunas_od ?? ""}
                onChange={(e) => onChange({ curva_pio_ayunas_od: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <Input
                type="number"
                step="0.1"
                placeholder="OI"
                aria-label="Curva de presión en ayunas ojo izquierdo"
                value={value.curva_pio_ayunas_oi ?? ""}
                onChange={(e) => onChange({ curva_pio_ayunas_oi: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Con sobrecarga hídrica (mmHg)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="0.1"
                placeholder="OD"
                aria-label="Curva de presión con sobrecarga hídrica ojo derecho"
                value={value.curva_pio_sobrecarga_od ?? ""}
                onChange={(e) =>
                  onChange({ curva_pio_sobrecarga_od: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <Input
                type="number"
                step="0.1"
                placeholder="OI"
                aria-label="Curva de presión con sobrecarga hídrica ojo izquierdo"
                value={value.curva_pio_sobrecarga_oi ?? ""}
                onChange={(e) =>
                  onChange({ curva_pio_sobrecarga_oi: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>
      </Section>


      <Section title="Diagnóstico">
        <div className="space-y-1.5">
          <Label htmlFor="dx">Diagnóstico</Label>
          <Textarea id="dx" rows={3} value={value.diagnostico ?? ""} onChange={(e) => onChange({ diagnostico: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cie10" className="flex items-center gap-2">
            CIE-10
            {cie10Sugerido && cie10Actual === cie10Sugerido ? (
              <span className="text-xs font-normal text-muted-foreground">(sugerido automáticamente)</span>
            ) : null}
          </Label>
          <Input
            id="cie10"
            placeholder="H52.1"
            value={value.cie10 ?? ""}
            onChange={(e) => {
              setCie10Sugerido(null);
              onChange({ cie10: e.target.value });
            }}
          />
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
        <LinksObrasSocialesChips obraSocial={obraSocial} />
        <div className="space-y-1.5">
          <Label htmlFor="proxima">Próxima cita</Label>
          <Input id="proxima" placeholder="Control en 3 meses" value={value.proxima_cita ?? ""} onChange={(e) => onChange({ proxima_cita: e.target.value })} />
        </div>
      </Section>
    </fieldset>
  );
}
