export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          commune_id: string
          created_at: string
          id: string
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          commune_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          commune_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      communes: {
        Row: {
          address: string | null
          associations: Json | null
          blason_url: string | null
          code_postal: string | null
          created_at: string
          custom_domain: string | null
          custom_primary_color: string | null
          description: string | null
          domain_verified: boolean | null
          email: string | null
          epci_id: string | null
          hero_image_url: string | null
          id: string
          infos_pratiques: Json | null
          invite_code: string
          logo_url: string | null
          motto: string | null
          name: string
          opening_hours: Json | null
          phone: string | null
          slug: string
          theme: string
        }
        Insert: {
          address?: string | null
          associations?: Json | null
          blason_url?: string | null
          code_postal?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_primary_color?: string | null
          description?: string | null
          domain_verified?: boolean | null
          email?: string | null
          epci_id?: string | null
          hero_image_url?: string | null
          id?: string
          infos_pratiques?: Json | null
          invite_code?: string
          logo_url?: string | null
          motto?: string | null
          name: string
          opening_hours?: Json | null
          phone?: string | null
          slug: string
          theme?: string
        }
        Update: {
          address?: string | null
          associations?: Json | null
          blason_url?: string | null
          code_postal?: string | null
          created_at?: string
          custom_domain?: string | null
          custom_primary_color?: string | null
          description?: string | null
          domain_verified?: boolean | null
          email?: string | null
          epci_id?: string | null
          hero_image_url?: string | null
          id?: string
          infos_pratiques?: Json | null
          invite_code?: string
          logo_url?: string | null
          motto?: string | null
          name?: string
          opening_hours?: Json | null
          phone?: string | null
          slug?: string
          theme?: string
        }
        Relationships: [
          {
            foreignKeyName: "communes_epci_id_fkey"
            columns: ["epci_id"]
            isOneToOne: false
            referencedRelation: "epci"
            referencedColumns: ["id"]
          },
        ]
      }
      council_documents: {
        Row: {
          category: string
          commune_id: string
          created_at: string | null
          document_date: string
          id: string
          storage_path: string
          title: string
        }
        Insert: {
          category: string
          commune_id: string
          created_at?: string | null
          document_date: string
          id?: string
          storage_path: string
          title: string
        }
        Update: {
          category?: string
          commune_id?: string
          created_at?: string | null
          document_date?: string
          id?: string
          storage_path?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_documents_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      epci: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      page_sections: {
        Row: {
          commune_id: string
          content: Json
          created_at: string | null
          id: string
          page: string
          section_type: string
          sort_order: number
          visible: boolean
        }
        Insert: {
          commune_id: string
          content?: Json
          created_at?: string | null
          id?: string
          page?: string
          section_type: string
          sort_order?: number
          visible?: boolean
        }
        Update: {
          commune_id?: string
          content?: Json
          created_at?: string | null
          id?: string
          page?: string
          section_type?: string
          sort_order?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          poll_option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_option_id_fkey"
            columns: ["poll_option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          created_at: string
          id: string
          poll_type: string
          post_id: string
          question: string
        }
        Insert: {
          allow_multiple?: boolean
          created_at?: string
          id?: string
          poll_type: string
          post_id: string
          question: string
        }
        Update: {
          allow_multiple?: boolean
          created_at?: string
          id?: string
          poll_type?: string
          post_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_images: {
        Row: {
          created_at: string
          id: string
          post_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          commune_id: string
          created_at: string
          epci_visible: boolean
          event_date: string | null
          event_location: string | null
          expires_at: string | null
          id: string
          is_hidden: boolean
          is_pinned: boolean
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          commune_id: string
          created_at?: string
          epci_visible?: boolean
          event_date?: string | null
          event_location?: string | null
          expires_at?: string | null
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          commune_id?: string
          created_at?: string
          epci_visible?: boolean
          event_date?: string | null
          event_location?: string | null
          expires_at?: string | null
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      producers: {
        Row: {
          categories: string[]
          commune_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          delivers: boolean
          description: string
          id: string
          name: string
          photo_path: string | null
          pickup_location: string | null
          schedule: string | null
          status: string
          updated_at: string
        }
        Insert: {
          categories: string[]
          commune_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          delivers?: boolean
          description: string
          id?: string
          name: string
          photo_path?: string | null
          pickup_location?: string | null
          schedule?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          commune_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          delivers?: boolean
          description?: string
          id?: string
          name?: string
          photo_path?: string | null
          pickup_location?: string | null
          schedule?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producers_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commune_id: string
          created_at: string
          display_name: string
          id: string
          push_token: string | null
          role: string
          status: string
        }
        Insert: {
          avatar_url?: string | null
          commune_id: string
          created_at?: string
          display_name: string
          id: string
          push_token?: string | null
          role?: string
          status?: string
        }
        Update: {
          avatar_url?: string | null
          commune_id?: string
          created_at?: string
          display_name?: string
          id?: string
          push_token?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_commune_id_fkey"
            columns: ["commune_id"]
            isOneToOne: false
            referencedRelation: "communes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string
          created_at: string
          id: string
          post_id: string
          reason: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string
          id: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      word_filters: {
        Row: {
          created_at: string
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_commune_id: { Args: never; Returns: string }
      is_approved: { Args: never; Returns: boolean }
      is_commune_admin: { Args: never; Returns: boolean }
      is_commune_moderator: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const

