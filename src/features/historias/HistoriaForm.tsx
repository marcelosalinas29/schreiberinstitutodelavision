import type { HistoriaClinicaInsert } from "@/types/domain";
import { MedicamentoPicker } from "@/features/historias/MedicamentoPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  diagnostico: "",
  cie10: "",
  tratamiento: "",
  proxima_cita: "",
};

interface Props {
  value: HistoriaDraft;
  onChange: (patch: Partial<HistoriaDraft>) => void;
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

export function HistoriaForm({ value, onChange }: Props) {
  const props = { value, onChange };

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
        <Bilateral {...props} label="AV sin corrección" odKey="av_sc_od" oiKey="av_sc_oi" placeholder="20/…" />
        <Bilateral {...props} label="AV con corrección" odKey="av_cc_od" oiKey="av_cc_oi" placeholder="20/…" />
        <Bilateral {...props} label="Biomicroscopía" odKey="bmc_od" oiKey="bmc_oi" />
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
        <Bilateral {...props} label="Fondo de ojo" odKey="fo_od" oiKey="fo_oi" />
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
