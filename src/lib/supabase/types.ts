// Gerado manualmente a partir de 001_fase1_fundacao_multitenant.sql +
// migration posterior que trocou tenants.niche (enum) por tenants.niche_id (fk -> niches.id).
// Atualizar sempre que uma nova migration for aplicada no schema `public`.

export type PaletteType = 'petroleo' | 'bege' | 'neutro'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'done' | 'no_show'
export type AppointmentType = 'consulta' | 'compromisso'
export type TransactionStatus = 'receivable' | 'received' | 'overdue'
export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'cancelled'

export type OdontogramStatus =
  | 'saudavel'
  | 'cariado'
  | 'restaurado'
  | 'ausente'
  | 'implante'
  | 'canal'
  | 'extracao_indicada'
export type TreatmentStatus = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado'

export type BudgetItem = {
  description: string
  quantity: number
  unit_price: number
  tooth_number?: string
  faces?: string[]
}

export type BusinessHoursDay = { start: string; end: string; active: boolean }
export type BusinessHours = {
  monday: BusinessHoursDay
  tuesday: BusinessHoursDay
  wednesday: BusinessHoursDay
  thursday: BusinessHoursDay
  friday: BusinessHoursDay
  saturday: BusinessHoursDay
  sunday: BusinessHoursDay
}

export interface Database {
  public: {
    Tables: {
      niches: {
        Row: {
          id: string
          slug: string
          label: string
          icon: string
          sort_order: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          label: string
          icon: string
          sort_order?: number
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['niches']['Insert']>
        Relationships: []
      }
      tenants: {
        Row: {
          id: string
          name: string
          niche_id: string
          theme_palette: PaletteType
          chatwoot_account_id: number | null
          evolution_instance_name: string | null
          created_at: string
          subscription_status: SubscriptionStatus
          trial_ends_at: string | null
          monthly_price: number | null
          next_due_date: string | null
          admin_notes: string | null
          business_hours: BusinessHours
          chatwoot_base_url: string | null
          chatwoot_api_token: string | null
          chatwoot_inbox_id: number | null
          evolution_base_url: string | null
          evolution_api_key: string | null
        }
        Insert: {
          id?: string
          name: string
          niche_id: string
          theme_palette?: PaletteType
          chatwoot_account_id?: number | null
          evolution_instance_name?: string | null
          created_at?: string
          subscription_status?: SubscriptionStatus
          trial_ends_at?: string | null
          monthly_price?: number | null
          next_due_date?: string | null
          admin_notes?: string | null
          business_hours?: BusinessHours
          chatwoot_base_url?: string | null
          chatwoot_api_token?: string | null
          chatwoot_inbox_id?: number | null
          evolution_base_url?: string | null
          evolution_api_key?: string | null
        }
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'tenants_niche_id_fkey'
            columns: ['niche_id']
            referencedRelation: 'niches'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          auth_id: string
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          auth_id: string
          email: string
          role?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      admin_users: {
        Row: {
          id: string
          auth_id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          email: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          tenant_id: string
          name: string
          phone: string | null
          document: string | null
          birth_date: string | null
          tags: string[]
          niche_data: Record<string, unknown>
          created_at: string
          convenio: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          phone?: string | null
          document?: string | null
          birth_date?: string | null
          tags?: string[]
          niche_data?: Record<string, unknown>
          created_at?: string
          convenio?: string | null
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'clients_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      appointment_labels: {
        Row: {
          id: string
          tenant_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['appointment_labels']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'appointment_labels_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          tenant_id: string
          client_id: string | null
          datetime: string
          duration_min: number
          status: AppointmentStatus
          notes: string | null
          created_at: string
          type: AppointmentType
          title: string | null
          label_id: string | null
          reminder_24h_sent_at: string | null
          reminder_2h_sent_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id?: string | null
          datetime: string
          duration_min?: number
          status?: AppointmentStatus
          notes?: string | null
          created_at?: string
          type?: AppointmentType
          title?: string | null
          label_id?: string | null
          reminder_24h_sent_at?: string | null
          reminder_2h_sent_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'appointments_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_label_id_fkey'
            columns: ['label_id']
            referencedRelation: 'appointment_labels'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          tenant_id: string
          client_id: string | null
          appointment_id: string | null
          amount: number
          status: TransactionStatus
          due_date: string | null
          created_at: string
          guia_number: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id?: string | null
          appointment_id?: string | null
          amount: number
          status?: TransactionStatus
          due_date?: string | null
          created_at?: string
          guia_number?: string | null
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'transactions_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_appointment_id_fkey'
            columns: ['appointment_id']
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      odontogram_records: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          tooth_number: string
          status: OdontogramStatus
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          tooth_number: string
          status?: OdontogramStatus
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['odontogram_records']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'odontogram_records_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      anamnesis: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          questionnaire: Record<string, unknown>
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          questionnaire?: Record<string, unknown>
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['anamnesis']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'anamnesis_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      treatment_budgets: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          items: BudgetItem[]
          total: number
          approved_at: string | null
          created_at: string
          down_payment: number
          installments: number
          discount: number
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          items?: BudgetItem[]
          total?: number
          approved_at?: string | null
          created_at?: string
          down_payment?: number
          installments?: number
          discount?: number
        }
        Update: Partial<Database['public']['Tables']['treatment_budgets']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'treatment_budgets_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      treatments: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          procedure: string
          status: TreatmentStatus
          budget_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          procedure: string
          status?: TreatmentStatus
          budget_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['treatments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'treatments_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatments_budget_id_fkey'
            columns: ['budget_id']
            referencedRelation: 'treatment_budgets'
            referencedColumns: ['id']
          },
        ]
      }
      evolutions: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          appointment_id: string | null
          note: string
          created_at: string
          professional: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          appointment_id?: string | null
          note: string
          created_at?: string
          professional?: string | null
        }
        Update: Partial<Database['public']['Tables']['evolutions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'evolutions_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evolutions_appointment_id_fkey'
            columns: ['appointment_id']
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
