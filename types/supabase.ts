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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          external_id: string
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          external_id: string
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          external_id?: string
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          assigned_to: string | null
          created_at: string
          description: string | null
          id: string
          organization_id: string
          severity: string
          status: string
          title: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          alert_type: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          severity: string
          status?: string
          title: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          severity?: string
          status?: string
          title?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_alerts: {
        Row: {
          alert_id: string
          case_id: string
          created_at: string
        }
        Insert: {
          alert_id: string
          case_id: string
          created_at?: string
        }
        Update: {
          alert_id?: string
          case_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_alerts_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_alerts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          author_user_id: string
          case_id: string
          created_at: string
          id: string
          note: string
          organization_id: string
        }
        Insert: {
          author_user_id: string
          case_id: string
          created_at?: string
          id?: string
          note: string
          organization_id: string
        }
        Update: {
          author_user_id?: string
          case_id?: string
          created_at?: string
          id?: string
          note?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_to: string | null
          case_number: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_number: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_number?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          country_of_residence: string | null
          created_at: string
          external_id: string | null
          full_name: string
          id: string
          kyc_status: string
          organization_id: string
          risk_tier: string
        }
        Insert: {
          country_of_residence?: string | null
          created_at?: string
          external_id?: string | null
          full_name: string
          id?: string
          kyc_status?: string
          organization_id: string
          risk_tier?: string
        }
        Update: {
          country_of_residence?: string | null
          created_at?: string
          external_id?: string | null
          full_name?: string
          id?: string
          kyc_status?: string
          organization_id?: string
          risk_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          payload: Json
          run_after: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          organization_id: string
          payload: Json
          run_after?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          organization_id?: string
          payload?: Json
          run_after?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          jurisdiction: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          organization_id: string
          role: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatory_documents: {
        Row: {
          action_items: Json
          affected_areas: Json
          analysis_model: string | null
          analysis_status: string
          analyzed_at: string | null
          attention_reason: string | null
          change_type: string | null
          content: string
          created_at: string
          created_by: string | null
          document_type: string
          effective_at: string | null
          id: string
          impact_level: string | null
          jurisdiction: string
          key_points: Json
          organization_id: string
          published_at: string | null
          requires_attention: boolean
          source: string
          source_url: string | null
          summary: string | null
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          affected_areas?: Json
          analysis_model?: string | null
          analysis_status?: string
          analyzed_at?: string | null
          attention_reason?: string | null
          change_type?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          effective_at?: string | null
          id?: string
          impact_level?: string | null
          jurisdiction?: string
          key_points?: Json
          organization_id: string
          published_at?: string | null
          requires_attention?: boolean
          source: string
          source_url?: string | null
          summary?: string | null
          tags?: Json
          title: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          affected_areas?: Json
          analysis_model?: string | null
          analysis_status?: string
          analyzed_at?: string | null
          attention_reason?: string | null
          change_type?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          effective_at?: string | null
          id?: string
          impact_level?: string | null
          jurisdiction?: string
          key_points?: Json
          organization_id?: string
          published_at?: string | null
          requires_attention?: boolean
          source?: string
          source_url?: string | null
          summary?: string | null
          tags?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          case_id: string | null
          created_at: string
          generated_by_model: string | null
          id: string
          narrative: string | null
          organization_id: string
          report_type: string
          status: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          generated_by_model?: string | null
          id?: string
          narrative?: string | null
          organization_id: string
          report_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          generated_by_model?: string | null
          id?: string
          narrative?: string | null
          organization_id?: string
          report_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_scores: {
        Row: {
          created_at: string
          factors: Json
          id: string
          level: string
          model_name: string
          model_provider: string
          organization_id: string
          score: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          factors?: Json
          id?: string
          level: string
          model_name: string
          model_provider?: string
          organization_id: string
          score: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          factors?: Json
          id?: string
          level?: string
          model_name?: string
          model_provider?: string
          organization_id?: string
          score?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_scores_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          conditions: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          rule_type: string
          severity: string
        }
        Insert: {
          conditions: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          rule_type: string
          severity: string
        }
        Update: {
          conditions?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          rule_type?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sanctions_hits: {
        Row: {
          created_at: string
          hit_status: string
          id: string
          match_score: number
          matched_field: string
          matched_value: string
          organization_id: string
          rationale: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screening_provider: string
          transaction_id: string
          watchlist_entry_id: string
        }
        Insert: {
          created_at?: string
          hit_status: string
          id?: string
          match_score: number
          matched_field: string
          matched_value: string
          organization_id: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screening_provider?: string
          transaction_id: string
          watchlist_entry_id: string
        }
        Update: {
          created_at?: string
          hit_status?: string
          id?: string
          match_score?: number
          matched_field?: string
          matched_value?: string
          organization_id?: string
          rationale?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screening_provider?: string
          transaction_id?: string
          watchlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_hits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_hits_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_hits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_hits_watchlist_entry_id_fkey"
            columns: ["watchlist_entry_id"]
            isOneToOne: false
            referencedRelation: "watchlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          counterparty_country: string | null
          counterparty_name: string | null
          created_at: string
          currency: string
          external_tx_id: string | null
          from_account_id: string | null
          id: string
          idempotency_key: string
          organization_id: string
          risk_explanation: string | null
          risk_level: string | null
          risk_score: number | null
          scored_at: string | null
          screened_at: string | null
          screening_status: string
          status: string
          to_account_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          counterparty_country?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          external_tx_id?: string | null
          from_account_id?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          risk_explanation?: string | null
          risk_level?: string | null
          risk_score?: number | null
          scored_at?: string | null
          screened_at?: string | null
          screening_status?: string
          status?: string
          to_account_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          counterparty_country?: string | null
          counterparty_name?: string | null
          created_at?: string
          currency?: string
          external_tx_id?: string | null
          from_account_id?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          risk_explanation?: string | null
          risk_level?: string | null
          risk_score?: number | null
          scored_at?: string | null
          screened_at?: string | null
          screening_status?: string
          status?: string
          to_account_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_entries: {
        Row: {
          aliases: Json
          aliases_normalized: Json
          country: string | null
          created_at: string
          entity_name: string
          entity_type: string
          external_ref: string | null
          id: string
          is_active: boolean
          list_name: string
          metadata: Json
          name_normalized: string
          source: string
          updated_at: string
        }
        Insert: {
          aliases?: Json
          aliases_normalized?: Json
          country?: string | null
          created_at?: string
          entity_name: string
          entity_type?: string
          external_ref?: string | null
          id?: string
          is_active?: boolean
          list_name?: string
          metadata?: Json
          name_normalized: string
          source?: string
          updated_at?: string
        }
        Update: {
          aliases?: Json
          aliases_normalized?: Json
          country?: string | null
          created_at?: string
          entity_name?: string
          entity_type?: string
          external_ref?: string | null
          id?: string
          is_active?: boolean
          list_name?: string
          metadata?: Json
          name_normalized?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_jobs: {
        Args: { p_job_type: string; p_limit?: number }
        Returns: {
          attempts: number
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          organization_id: string
          payload: Json
          run_after: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_org_id: { Args: never; Returns: string }
      ingest_transaction: {
        Args: {
          p_amount?: number
          p_counterparty_country?: string
          p_counterparty_name?: string
          p_currency?: string
          p_external_tx_id?: string
          p_from_account_id?: string
          p_idempotency_key: string
          p_to_account_id?: string
          p_transaction_type?: string
        }
        Returns: {
          idempotent_replay: boolean
          jobs_enqueued: number
          transaction_id: string
        }[]
      }
      invoke_phase2_job_scheduler: {
        Args: { p_job_types?: string[]; p_limit?: number }
        Returns: number
      }
      normalize_screening_name: { Args: { input: string }; Returns: string }
      search_watchlist_candidates: {
        Args: { p_limit?: number; p_search_name: string }
        Returns: {
          aliases: Json
          aliases_normalized: Json
          country: string
          entity_name: string
          entity_type: string
          id: string
          list_name: string
          name_normalized: string
          score: number
          source: string
        }[]
      }
      seed_default_rules: {
        Args: { target_org_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
