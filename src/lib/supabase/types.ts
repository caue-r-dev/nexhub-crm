// Gerado manualmente a partir de 001_fase1_fundacao_multitenant.sql +
// migration posterior que trocou tenants.niche (enum) por tenants.niche_id (fk -> niches.id).
// Atualizar sempre que uma nova migration for aplicada no schema `public`.

export type PaletteType = 'petroleo' | 'bege' | 'neutro'
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'done' | 'no_show'
export type AppointmentType = 'consulta' | 'compromisso'
export type TransactionStatus = 'receivable' | 'received' | 'overdue'
export type TransactionType = 'receita' | 'despesa'
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
export type PaymentStatus = 'nao_solicitado' | 'aguardando' | 'confirmado'
export type BookingSource = 'internal' | 'public_booking'

export type BudgetItem = {
  description: string
  quantity: number
  unit_price: number
  tooth_number?: string
  faces?: string[]
  service_id?: string
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
          pix_key: string | null
          pix_receiver_name: string | null
          reminder_message_24h: string | null
          reminder_message_2h: string | null
          budget_followup_message_day3: string | null
          budget_followup_message_day7: string | null
          onboarding_completed: boolean
          default_deposit_amount: number | null
          slug: string | null
          notification_phone: string | null
          slot_duration_minutes: number
          buffer_minutes: number
          booking_hold_minutes: number
          whatsapp_qr_requested_at: string | null
          phone: string | null
          email: string | null
          address: string | null
          welcome_message: string | null
          google_review_link: string | null
          cnpj: string | null
          social_media: string | null
          website_url: string | null
          last_whatsapp_state: string | null
          connecting_since: string | null
          bot_enabled: boolean
          bot_context_notes: string | null
          public_booking_enabled: boolean
          latitude: number | null
          longitude: number | null
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
          pix_key?: string | null
          pix_receiver_name?: string | null
          reminder_message_24h?: string | null
          reminder_message_2h?: string | null
          welcome_message?: string | null
          google_review_link?: string | null
          budget_followup_message_day3?: string | null
          budget_followup_message_day7?: string | null
          onboarding_completed?: boolean
          default_deposit_amount?: number | null
          slug?: string | null
          notification_phone?: string | null
          slot_duration_minutes?: number
          buffer_minutes?: number
          booking_hold_minutes?: number
          whatsapp_qr_requested_at?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          cnpj?: string | null
          social_media?: string | null
          website_url?: string | null
          last_whatsapp_state?: string | null
          connecting_since?: string | null
          bot_enabled?: boolean
          bot_context_notes?: string | null
          public_booking_enabled?: boolean
          latitude?: number | null
          longitude?: number | null
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
          must_change_password: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          auth_id: string
          email: string
          role?: string
          created_at?: string
          must_change_password?: boolean
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
          photo_path: string | null
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
          photo_path?: string | null
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
          professional_id: string | null
          package_id: string | null
          payment_status: PaymentStatus
          deposit_amount: number | null
          source: BookingSource
          booking_expires_at: string | null
          followup_atraso_sent_at: string | null
          followup_falta_sent_at: string | null
          processo_id: string | null
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
          professional_id?: string | null
          package_id?: string | null
          payment_status?: PaymentStatus
          deposit_amount?: number | null
          source?: BookingSource
          booking_expires_at?: string | null
          followup_atraso_sent_at?: string | null
          followup_falta_sent_at?: string | null
          processo_id?: string | null
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
          {
            foreignKeyName: 'appointments_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_package_id_fkey'
            columns: ['package_id']
            referencedRelation: 'packages'
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
          type: TransactionType
          description: string | null
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
          type?: TransactionType
          description?: string | null
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
          declined_at: string | null
          followup_day3_sent_at: string | null
          followup_day7_sent_at: string | null
          professional_id: string | null
          fee_type: 'fixo' | 'exito' | 'misto' | null
          success_fee_percent: number | null
          case_value: number | null
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
          declined_at?: string | null
          followup_day3_sent_at?: string | null
          followup_day7_sent_at?: string | null
          professional_id?: string | null
          fee_type?: 'fixo' | 'exito' | 'misto' | null
          success_fee_percent?: number | null
          case_value?: number | null
        }
        Update: Partial<Database['public']['Tables']['treatment_budgets']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'treatment_budgets_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatment_budgets_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'treatment_budgets_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
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
      professionals: {
        Row: {
          id: string
          tenant_id: string
          name: string
          color: string
          active: boolean
          created_at: string
          registration_number: string | null
          role: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          color: string
          active?: boolean
          created_at?: string
          registration_number?: string | null
          role?: string | null
        }
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'professionals_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      packages: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          service_name: string
          total_sessions: number
          used_sessions: number
          price: number | null
          purchased_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          service_name: string
          total_sessions: number
          used_sessions?: number
          price?: number | null
          purchased_at?: string
          expires_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['packages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'packages_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      professional_hours: {
        Row: {
          id: string
          tenant_id: string
          professional_id: string
          weekday: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          professional_id: string
          weekday: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['professional_hours']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'professional_hours_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
        ]
      }
      procedure_types: {
        Row: {
          id: string
          tenant_id: string
          name: string
          active: boolean
          created_at: string
          default_duration_min: number | null
          protocol: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          active?: boolean
          created_at?: string
          default_duration_min?: number | null
          protocol?: string | null
        }
        Update: Partial<Database['public']['Tables']['procedure_types']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'procedure_types_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      professional_procedure_durations: {
        Row: {
          id: string
          tenant_id: string
          professional_id: string
          procedure_type_id: string
          duration_min: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          professional_id: string
          procedure_type_id: string
          duration_min: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['professional_procedure_durations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'professional_procedure_durations_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'professional_procedure_durations_procedure_type_id_fkey'
            columns: ['procedure_type_id']
            referencedRelation: 'procedure_types'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_items: {
        Row: {
          id: string
          tenant_id: string
          name: string
          quantity: number
          unit: string
          min_quantity: number | null
          expires_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          quantity?: number
          unit?: string
          min_quantity?: number | null
          expires_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['inventory_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'inventory_items_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      satisfaction_surveys: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          appointment_id: string | null
          rating: number | null
          feedback: string | null
          created_at: string
          responded_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          appointment_id?: string | null
          rating?: number | null
          feedback?: string | null
          created_at?: string
          responded_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['satisfaction_surveys']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'satisfaction_surveys_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'satisfaction_surveys_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'satisfaction_surveys_appointment_id_fkey'
            columns: ['appointment_id']
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          },
        ]
      }
      clinical_documents: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          professional_id: string | null
          type: 'atestado' | 'receita'
          content: string
          created_at: string
          cid: string | null
          exam_date: string | null
          start_time: string | null
          end_time: string | null
          convalescence: boolean | null
          convalescence_period: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          professional_id?: string | null
          type: 'atestado' | 'receita'
          content: string
          created_at?: string
          cid?: string | null
          exam_date?: string | null
          start_time?: string | null
          end_time?: string | null
          convalescence?: boolean | null
          convalescence_period?: string | null
        }
        Update: Partial<Database['public']['Tables']['clinical_documents']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'clinical_documents_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'clinical_documents_professional_id_fkey'
            columns: ['professional_id']
            referencedRelation: 'professionals'
            referencedColumns: ['id']
          },
        ]
      }
      services: {
        Row: {
          id: string
          tenant_id: string
          name: string
          default_value: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          default_value?: number
          active?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'services_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      processos: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          numero_cnj: string | null
          vara_comarca: string | null
          tipo_acao: string | null
          area_direito: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          numero_cnj?: string | null
          vara_comarca?: string | null
          tipo_acao?: string | null
          area_direito?: string | null
          status?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['processos']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'processos_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      prazos: {
        Row: {
          id: string
          tenant_id: string
          processo_id: string
          tipo_prazo: string
          data_fatal: string
          status: 'pendente' | 'cumprido'
          alerta_dias_antes: number
          alerta_enviado_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          processo_id: string
          tipo_prazo: string
          data_fatal: string
          status?: 'pendente' | 'cumprido'
          alerta_dias_antes?: number
          alerta_enviado_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['prazos']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'prazos_processo_id_fkey'
            columns: ['processo_id']
            referencedRelation: 'processos'
            referencedColumns: ['id']
          },
        ]
      }
      animals: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          name: string
          species: string | null
          breed: string | null
          weight: number | null
          birth_date: string | null
          hospitalized: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          name: string
          species?: string | null
          breed?: string | null
          weight?: number | null
          birth_date?: string | null
          hospitalized?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['animals']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'animals_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      animal_vaccines: {
        Row: {
          id: string
          tenant_id: string
          animal_id: string
          vaccine_name: string
          applied_at: string
          professional: string | null
          next_dose_at: string | null
          reminder_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          animal_id: string
          vaccine_name: string
          applied_at: string
          professional?: string | null
          next_dose_at?: string | null
          reminder_sent_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['animal_vaccines']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'animal_vaccines_animal_id_fkey'
            columns: ['animal_id']
            referencedRelation: 'animals'
            referencedColumns: ['id']
          },
        ]
      }
      animal_hospitalizations: {
        Row: {
          id: string
          tenant_id: string
          animal_id: string
          reason: string | null
          admitted_at: string
          discharged_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          animal_id: string
          reason?: string | null
          admitted_at?: string
          discharged_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['animal_hospitalizations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'animal_hospitalizations_animal_id_fkey'
            columns: ['animal_id']
            referencedRelation: 'animals'
            referencedColumns: ['id']
          },
        ]
      }
      animal_hospitalization_notes: {
        Row: {
          id: string
          hospitalization_id: string
          tenant_id: string
          note: string
          created_at: string
        }
        Insert: {
          id?: string
          hospitalization_id: string
          tenant_id: string
          note: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['animal_hospitalization_notes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'animal_hospitalization_notes_hospitalization_id_fkey'
            columns: ['hospitalization_id']
            referencedRelation: 'animal_hospitalizations'
            referencedColumns: ['id']
          },
        ]
      }
      message_templates: {
        Row: {
          id: string
          tenant_id: string
          template_key: string
          content: string
          active: boolean
          updated_at: string
          label: string | null
          hidden: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          template_key: string
          content: string
          active?: boolean
          updated_at?: string
          label?: string | null
          hidden?: boolean
        }
        Update: Partial<Database['public']['Tables']['message_templates']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'message_templates_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      evolution_incidents: {
        Row: {
          id: string
          instance_name: string
          error_message: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          instance_name: string
          error_message: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['evolution_incidents']['Insert']>
        Relationships: []
      }
      contact_locks: {
        Row: {
          tenant_id: string
          contact_phone: string
          locked_at: string
        }
        Insert: {
          tenant_id: string
          contact_phone: string
          locked_at?: string
        }
        Update: Partial<Database['public']['Tables']['contact_locks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'contact_locks_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      prostheses: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          type: string
          tooth_number: string | null
          status: string
          sent_to_lab_at: string | null
          expected_return_at: string | null
          received_at: string | null
          delivered_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          type: string
          tooth_number?: string | null
          status?: string
          sent_to_lab_at?: string | null
          expected_return_at?: string | null
          received_at?: string | null
          delivered_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['prostheses']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'prostheses_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      conversation_state: {
        Row: {
          id: string
          tenant_id: string
          contact_phone: string
          current_stage: string
          captured_data: Record<string, unknown>
          updated_at: string
          escalated: boolean
          messages: { role: 'paciente' | 'bot'; text: string }[]
          done: boolean
        }
        Insert: {
          id?: string
          tenant_id: string
          contact_phone: string
          current_stage?: string
          captured_data?: Record<string, unknown>
          updated_at?: string
          escalated?: boolean
          messages?: { role: 'paciente' | 'bot'; text: string }[]
          done?: boolean
        }
        Update: Partial<Database['public']['Tables']['conversation_state']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'conversation_state_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      campaigns: {
        Row: {
          id: string
          tenant_id: string
          filter_type: 'sem_visita' | 'orcamento_aberto'
          filter_days: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          filter_type: 'sem_visita' | 'orcamento_aberto'
          filter_days: number
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'campaigns_tenant_id_fkey'
            columns: ['tenant_id']
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      pain_points: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          view: 'front' | 'back'
          x: number
          y: number
          note: string
          region: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          view: 'front' | 'back'
          x: number
          y: number
          note?: string
          region?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['pain_points']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'pain_points_client_id_fkey'
            columns: ['client_id']
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
        ]
      }
      campaign_recipients: {
        Row: {
          id: string
          campaign_id: string
          client_id: string
          phone: string
          message: string
          status: 'pending' | 'sent' | 'failed'
          sent_at: string | null
          responded_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          client_id: string
          phone: string
          message: string
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          responded_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['campaign_recipients']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'campaign_recipients_campaign_id_fkey'
            columns: ['campaign_id']
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
