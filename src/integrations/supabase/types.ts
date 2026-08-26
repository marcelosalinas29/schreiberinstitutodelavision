export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cierres_caja: {
        Row: {
          cerrado_por: string | null
          created_at: string
          fecha: string
          id: string
          observaciones: string | null
          total_efectivo: number
          total_general: number
          total_mercado_pago: number
          total_tarjeta: number
          total_transferencia: number
          turno_label: string | null
        }
        Insert: {
          cerrado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          total_efectivo?: number
          total_general?: number
          total_mercado_pago?: number
          total_tarjeta?: number
          total_transferencia?: number
          turno_label?: string | null
        }
        Update: {
          cerrado_por?: string | null
          created_at?: string
          fecha?: string
          id?: string
          observaciones?: string | null
          total_efectivo?: number
          total_general?: number
          total_mercado_pago?: number
          total_tarjeta?: number
          total_transferencia?: number
          turno_label?: string | null
        }
        Relationships: []
      }
      cobros: {
        Row: {
          concepto: string | null
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          medio: Database["public"]["Enums"]["medio_pago"]
          monto: number
          obra_social: string | null
          paciente_id: string | null
          tipo: Database["public"]["Enums"]["tipo_cobro"]
          turno_id: string | null
          updated_at: string
        }
        Insert: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          medio?: Database["public"]["Enums"]["medio_pago"]
          monto?: number
          obra_social?: string | null
          paciente_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cobro"]
          turno_id?: string | null
          updated_at?: string
        }
        Update: {
          concepto?: string | null
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          medio?: Database["public"]["Enums"]["medio_pago"]
          monto?: number
          obra_social?: string | null
          paciente_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cobro"]
          turno_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobros_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobros_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_clinicos: {
        Row: {
          contenido: string
          created_at: string
          id: string
          nombre: string
          owner_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          contenido: string
          created_at?: string
          id?: string
          nombre: string
          owner_id?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          contenido?: string
          created_at?: string
          id?: string
          nombre?: string
          owner_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      historias_clinicas: {
        Row: {
          antecedentes_familiares: string | null
          antecedentes_oftalmologicos: string | null
          antecedentes_personales: string | null
          arm_od: string | null
          arm_oi: string | null
          autor_id: string | null
          av_cc_od: string | null
          av_cc_oi: string | null
          av_sc_od: string | null
          av_sc_oi: string | null
          bmc_od: string | null
          bmc_oi: string | null
          cie10: string | null
          created_at: string
          cv_od_imagen_url: string | null
          cv_oi_imagen_url: string | null
          diagnostico: string | null
          dictado_crudo: string | null
          examen_ocular_obs: string | null
          fecha: string
          fo_od: string | null
          fo_od_imagen_url: string | null
          fo_oi: string | null
          fo_oi_imagen_url: string | null
          id: string
          motivo_consulta: string | null
          paciente_id: string
          pio_hora: string | null
          pio_od: number | null
          pio_oi: number | null
          proxima_cita: string | null
          refraccion_od: string | null
          refraccion_oi: string | null
          tratamiento: string | null
          turno_id: string | null
          updated_at: string
        }
        Insert: {
          antecedentes_familiares?: string | null
          antecedentes_oftalmologicos?: string | null
          antecedentes_personales?: string | null
          arm_od?: string | null
          arm_oi?: string | null
          autor_id?: string | null
          av_cc_od?: string | null
          av_cc_oi?: string | null
          av_sc_od?: string | null
          av_sc_oi?: string | null
          bmc_od?: string | null
          bmc_oi?: string | null
          cie10?: string | null
          created_at?: string
          cv_od_imagen_url?: string | null
          cv_oi_imagen_url?: string | null
          diagnostico?: string | null
          dictado_crudo?: string | null
          examen_ocular_obs?: string | null
          fecha?: string
          fo_od?: string | null
          fo_od_imagen_url?: string | null
          fo_oi?: string | null
          fo_oi_imagen_url?: string | null
          id?: string
          motivo_consulta?: string | null
          paciente_id: string
          pio_hora?: string | null
          pio_od?: number | null
          pio_oi?: number | null
          proxima_cita?: string | null
          refraccion_od?: string | null
          refraccion_oi?: string | null
          tratamiento?: string | null
          turno_id?: string | null
          updated_at?: string
        }
        Update: {
          antecedentes_familiares?: string | null
          antecedentes_oftalmologicos?: string | null
          antecedentes_personales?: string | null
          arm_od?: string | null
          arm_oi?: string | null
          autor_id?: string | null
          av_cc_od?: string | null
          av_cc_oi?: string | null
          av_sc_od?: string | null
          av_sc_oi?: string | null
          bmc_od?: string | null
          bmc_oi?: string | null
          cie10?: string | null
          created_at?: string
          cv_od_imagen_url?: string | null
          cv_oi_imagen_url?: string | null
          diagnostico?: string | null
          dictado_crudo?: string | null
          examen_ocular_obs?: string | null
          fecha?: string
          fo_od?: string | null
          fo_od_imagen_url?: string | null
          fo_oi?: string | null
          fo_oi_imagen_url?: string | null
          id?: string
          motivo_consulta?: string | null
          paciente_id?: string
          pio_hora?: string | null
          pio_od?: number | null
          pio_oi?: number | null
          proxima_cita?: string | null
          refraccion_od?: string | null
          refraccion_oi?: string | null
          tratamiento?: string | null
          turno_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historias_clinicas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historias_clinicas_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos: {
        Row: {
          created_at: string
          dosis: string | null
          id: string
          nombre: string
          owner_id: string | null
          posologia: string
          unidades_envase: string | null
          updated_at: string
          via_administracion: string | null
        }
        Insert: {
          created_at?: string
          dosis?: string | null
          id?: string
          nombre: string
          owner_id?: string | null
          posologia: string
          unidades_envase?: string | null
          updated_at?: string
          via_administracion?: string | null
        }
        Update: {
          created_at?: string
          dosis?: string | null
          id?: string
          nombre?: string
          owner_id?: string | null
          posologia?: string
          unidades_envase?: string | null
          updated_at?: string
          via_administracion?: string | null
        }
        Relationships: []
      }
      mensajes_chat: {
        Row: {
          autor_id: string
          contenido: string
          created_at: string
          id: string
        }
        Insert: {
          autor_id: string
          contenido: string
          created_at?: string
          id?: string
        }
        Update: {
          autor_id?: string
          contenido?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          apellido: string
          consiente_administrativo: boolean
          consiente_recetas: boolean
          consiente_recordatorios: boolean
          created_at: string
          created_by: string | null
          direccion: string | null
          dni: string | null
          email: string | null
          fecha_nacimiento: string | null
          id: string
          localidad: string | null
          nombre: string
          notas: string | null
          nro_afiliado: string | null
          obra_social: string | null
          plan: string | null
          sexo: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          apellido: string
          consiente_administrativo?: boolean
          consiente_recetas?: boolean
          consiente_recordatorios?: boolean
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre: string
          notas?: string | null
          nro_afiliado?: string | null
          obra_social?: string | null
          plan?: string | null
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          apellido?: string
          consiente_administrativo?: boolean
          consiente_recetas?: boolean
          consiente_recordatorios?: boolean
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          dni?: string | null
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          localidad?: string | null
          nombre?: string
          notas?: string | null
          nro_afiliado?: string | null
          obra_social?: string | null
          plan?: string | null
          sexo?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plantillas: {
        Row: {
          created_at: string
          direccion: string | null
          firma_url: string | null
          id: string
          institucion: string | null
          logo_url: string | null
          matricula: string | null
          nombre: string
          owner_id: string
          pie_pagina: string | null
          profesional: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          firma_url?: string | null
          id?: string
          institucion?: string | null
          logo_url?: string | null
          matricula?: string | null
          nombre?: string
          owner_id: string
          pie_pagina?: string | null
          profesional?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          firma_url?: string | null
          id?: string
          institucion?: string | null
          logo_url?: string | null
          matricula?: string | null
          nombre?: string
          owner_id?: string
          pie_pagina?: string | null
          profesional?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      practicas_estudios: {
        Row: {
          codigo: string | null
          contenido: string
          created_at: string
          id: string
          nombre: string
          obra_social: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          contenido: string
          created_at?: string
          id?: string
          nombre: string
          obra_social?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          contenido?: string
          created_at?: string
          id?: string
          nombre?: string
          obra_social?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          especialidad: string | null
          firma_sello_url: string | null
          id: string
          matricula: string | null
          matricula_nacional: string | null
          nombre_completo: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          especialidad?: string | null
          firma_sello_url?: string | null
          id: string
          matricula?: string | null
          matricula_nacional?: string | null
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          especialidad?: string | null
          firma_sello_url?: string | null
          id?: string
          matricula?: string | null
          matricula_nacional?: string | null
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      turnos: {
        Row: {
          created_at: string
          created_by: string | null
          duracion_min: number
          estado: Database["public"]["Enums"]["turno_estado"]
          id: string
          inicio: string
          motivo: string | null
          notas: string | null
          paciente_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duracion_min?: number
          estado?: Database["public"]["Enums"]["turno_estado"]
          id?: string
          inicio: string
          motivo?: string | null
          notas?: string | null
          paciente_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duracion_min?: number
          estado?: Database["public"]["Enums"]["turno_estado"]
          id?: string
          inicio?: string
          motivo?: string | null
          notas?: string | null
          paciente_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      limpiar_mensajes_chat_viejos: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "medico" | "secretaria"
      medio_pago: "efectivo" | "transferencia" | "tarjeta" | "mercado_pago"
      tipo_cobro:
        | "consulta_particular"
        | "copago"
        | "bono_obra_social"
        | "coseguro"
        | "practica"
        | "otro"
      turno_estado:
        | "pendiente"
        | "en_espera"
        | "en_consulta"
        | "atendido"
        | "cancelado"
        | "ausente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["medico", "secretaria"],
      medio_pago: ["efectivo", "transferencia", "tarjeta", "mercado_pago"],
      tipo_cobro: [
        "consulta_particular",
        "copago",
        "bono_obra_social",
        "coseguro",
        "practica",
        "otro",
      ],
      turno_estado: [
        "pendiente",
        "en_espera",
        "en_consulta",
        "atendido",
        "cancelado",
        "ausente",
      ],
    },
  },
} as const
