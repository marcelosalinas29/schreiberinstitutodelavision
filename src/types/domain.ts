import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];

export type AppRole = Database["public"]["Enums"]["app_role"];
export type TurnoEstado = Database["public"]["Enums"]["turno_estado"];
export type MedioPago = Database["public"]["Enums"]["medio_pago"];
export type TipoCobro = Database["public"]["Enums"]["tipo_cobro"];

export type Paciente = Tables["pacientes"]["Row"];
export type PacienteInsert = Tables["pacientes"]["Insert"];
export type PacienteUpdate = Tables["pacientes"]["Update"];

export type Turno = Tables["turnos"]["Row"];
export type TurnoInsert = Tables["turnos"]["Insert"];
export type TurnoUpdate = Tables["turnos"]["Update"];
export type TurnoConPaciente = Turno & { paciente: Pick<Paciente, "id" | "nombre" | "apellido" | "dni" | "obra_social"> | null };

export type HistoriaClinica = Tables["historias_clinicas"]["Row"];
export type HistoriaClinicaInsert = Tables["historias_clinicas"]["Insert"];

export type Cobro = Tables["cobros"]["Row"];
export type CobroInsert = Tables["cobros"]["Insert"];
export type CobroConPaciente = Cobro & { paciente: Pick<Paciente, "id" | "nombre" | "apellido"> | null };

export type CierreCaja = Tables["cierres_caja"]["Row"];
export type CierreCajaInsert = Tables["cierres_caja"]["Insert"];

export type Plantilla = Tables["plantillas"]["Row"];
export type PlantillaInsert = Tables["plantillas"]["Insert"];

export type PracticaEstudio = Tables["practicas_estudios"]["Row"];
export type PracticaEstudioInsert = Tables["practicas_estudios"]["Insert"];

export type Profile = Tables["profiles"]["Row"];

export const ESTADOS_TURNO: { value: TurnoEstado; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_espera", label: "En espera" },
  { value: "en_consulta", label: "En consulta" },
  { value: "atendido", label: "Atendido" },
  { value: "cancelado", label: "Cancelado" },
  { value: "ausente", label: "Ausente" },
];

export const MEDIOS_PAGO: { value: MedioPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "mercado_pago", label: "Mercado Pago" },
];

export const TIPOS_COBRO: { value: TipoCobro; label: string }[] = [
  { value: "consulta_particular", label: "Consulta particular" },
  { value: "copago", label: "Copago" },
  { value: "bono_obra_social", label: "Bono obra social" },
  { value: "coseguro", label: "Coseguro" },
  { value: "practica", label: "Práctica" },
  { value: "otro", label: "Otro" },
];

/** Campos que la IA puede completar a partir de un dictado desordenado. */
export interface DictadoParseado {
  motivo_consulta?: string;
  antecedentes_personales?: string;
  antecedentes_familiares?: string;
  antecedentes_oftalmologicos?: string;
  arm_od?: string;
  arm_oi?: string;
  refraccion_od?: string;
  refraccion_oi?: string;
  av_sc_od?: string;
  av_sc_oi?: string;
  av_cc_od?: string;
  av_cc_oi?: string;
  bmc_od?: string;
  bmc_oi?: string;
  pio_od?: number | null;
  pio_oi?: number | null;
  pio_hora?: string;
  fo_od?: string;
  fo_oi?: string;
  diagnostico?: string;
  cie10?: string;
  tratamiento?: string;
  proxima_cita?: string;
}

export interface ImportacionParseada {
  paciente: {
    nombre?: string;
    apellido?: string;
    dni?: string;
    fecha_nacimiento?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    obra_social?: string;
    nro_afiliado?: string;
  };
  historia: DictadoParseado & { fecha?: string };
  resumen: string;
}
