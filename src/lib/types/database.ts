export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_settings: {
        Row: {
          bullets_per_experience_block: number | null
          bullets_per_project_block: number | null
          created_at: string | null
          id: string
          language_model: string | null
          max_chars_per_bullet: number | null
          section_order: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bullets_per_experience_block?: number | null
          bullets_per_project_block?: number | null
          created_at?: string | null
          id?: string
          language_model?: string | null
          max_chars_per_bullet?: number | null
          section_order?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bullets_per_experience_block?: number | null
          bullets_per_project_block?: number | null
          created_at?: string | null
          id?: string
          language_model?: string | null
          max_chars_per_bullet?: number | null
          section_order?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          created_at: string | null
          degree: string
          degree_status: string | null
          description: string | null
          end_date: Json | null
          id: string
          institution: string
          location: string | null
          start_date: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          degree: string
          degree_status?: string | null
          description?: string | null
          end_date?: Json | null
          id?: string
          institution: string
          location?: string | null
          start_date?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          degree?: string
          degree_status?: string | null
          description?: string | null
          end_date?: Json | null
          id?: string
          institution?: string
          location?: string | null
          start_date?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          company_name: string
          created_at: string | null
          description: string | null
          end_month: string | null
          end_year: number | null
          id: string
          is_included: boolean | null
          is_present: boolean | null
          location: string
          position: number | null
          start_month: string | null
          start_year: number
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          description?: string | null
          end_month?: string | null
          end_year?: number | null
          id?: string
          is_included?: boolean | null
          is_present?: boolean | null
          location: string
          position?: number | null
          start_month?: string | null
          start_year: number
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          description?: string | null
          end_month?: string | null
          end_year?: number | null
          id?: string
          is_included?: boolean | null
          is_present?: boolean | null
          location?: string
          position?: number | null
          start_month?: string | null
          start_year?: number
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      experience_bullets: {
        Row: {
          created_at: string | null
          experience_id: string
          id: string
          is_locked: boolean | null
          position: number
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience_id: string
          id?: string
          is_locked?: boolean | null
          position?: number
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience_id?: string
          id?: string
          is_locked?: boolean | null
          position?: number
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_bullets_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experience"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_details: {
        Row: {
          created_at: string | null
          email: string
          github: string | null
          id: string
          linkedin: string | null
          location: string | null
          name: string
          phone: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          github?: string | null
          id?: string
          linkedin?: string | null
          location?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          github?: string | null
          id?: string
          linkedin?: string | null
          location?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      project_bullets: {
        Row: {
          created_at: string | null
          id: string
          is_locked: boolean | null
          position: number
          project_id: string
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          position?: number
          project_id: string
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          position?: number
          project_id?: string
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_bullets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_month: string | null
          end_year: number | null
          id: string
          is_included: boolean | null
          is_present: boolean | null
          link: string | null
          position: number | null
          start_month: string | null
          start_year: number
          technologies: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_month?: string | null
          end_year?: number | null
          id?: string
          is_included?: boolean | null
          is_present?: boolean | null
          link?: string | null
          position?: number | null
          start_month?: string | null
          start_year: number
          technologies?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_month?: string | null
          end_year?: number | null
          id?: string
          is_included?: boolean | null
          is_present?: boolean | null
          link?: string | null
          position?: number | null
          start_month?: string | null
          start_year?: number
          technologies?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string | null
          id: string
          languages: Json | null
          soft_skills: Json | null
          technical_skills: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          languages?: Json | null
          soft_skills?: Json | null
          technical_skills?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          languages?: Json | null
          soft_skills?: Json | null
          technical_skills?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_experience: {
        Args: { e_ids: string[] }
        Returns: string
      }
      delete_experience_bullets: {
        Args: { b_ids: string[] }
        Returns: string
      }
      delete_project: {
        Args: { p_ids: string[] }
        Returns: string
      }
      delete_project_bullets: {
        Args: { b_ids: string[] }
        Returns: string
      }
      update_experience_bullet_locks: {
        Args:
          | { bullet_data: Json }
          | { bullet_ids: string[]; bullet_locks: boolean[] }
        Returns: undefined
      }
      upsert_experience: {
        Args: {
          e_company_name: string
          e_description: string
          e_end_month: string
          e_end_year: number
          e_id: string
          e_is_included: boolean
          e_is_present: boolean
          e_location: string
          e_position: number
          e_start_month: string
          e_start_year: number
          e_title: string
        }
        Returns: string
      }
      upsert_experience_bullets: {
        Args:
          | {
              b_experience_ids: string[]
              b_ids: string[]
              b_is_locked: boolean[]
              b_positions: number[]
              b_texts: string[]
            }
          | { bullets: Json }
        Returns: string
      }
      upsert_personal_details: {
        Args: {
          p_email: string
          p_github: string
          p_linkedin: string
          p_location: string
          p_name: string
          p_phone: string
          p_website: string
        }
        Returns: string
      }
      upsert_project: {
        Args: {
          p_description: string
          p_end_month: string
          p_end_year: number
          p_id: string
          p_is_included: boolean
          p_is_present: boolean
          p_link: string
          p_position: number
          p_start_month: string
          p_start_year: number
          p_technologies: string[]
          p_title: string
        }
        Returns: string
      }
      upsert_project_bullets: {
        Args: { bullets: Json }
        Returns: string
      }
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

