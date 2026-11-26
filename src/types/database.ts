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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      annotation_tags: {
        Row: {
          annotation_id: string
          tag_id: string
        }
        Insert: {
          annotation_id: string
          tag_id: string
        }
        Update: {
          annotation_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotation_tags_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      annotations: {
        Row: {
          color: number
          created_at: string
          deleted_at: string | null
          id: string
          item_id: string
          kind: string
          locator: string | null
          page: number | null
          position: Json | null
          quote: Json | null
          text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_id: string
          kind: string
          locator?: string | null
          page?: number | null
          position?: Json | null
          quote?: Json | null
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          item_id?: string
          kind?: string
          locator?: string | null
          page?: number | null
          position?: Json | null
          quote?: Json | null
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_activity: {
        Row: {
          item_id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          item_id: string
          opened_at?: string
          user_id?: string
        }
        Update: {
          item_id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_activity_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_links: {
        Row: {
          created_at: string
          from_item_id: string
          origin: string
          to_item_id: string
        }
        Insert: {
          created_at?: string
          from_item_id: string
          origin?: string
          to_item_id: string
        }
        Update: {
          created_at?: string
          from_item_id?: string
          origin?: string
          to_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_links_from_item_id_fkey"
            columns: ["from_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_links_to_item_id_fkey"
            columns: ["to_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_pages: {
        Row: {
          item_id: string
          page: number
          search_vector: unknown
          text: string
        }
        Insert: {
          item_id: string
          page: number
          search_vector?: unknown
          text?: string
        }
        Update: {
          item_id?: string
          page?: number
          search_vector?: unknown
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_pages_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_projects: {
        Row: {
          item_id: string
          project_id: string
        }
        Insert: {
          item_id: string
          project_id: string
        }
        Update: {
          item_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_projects_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_tags: {
        Row: {
          item_id: string
          tag_id: string
        }
        Insert: {
          item_id: string
          tag_id: string
        }
        Update: {
          item_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          anchor_item_id: string | null
          body: string | null
          citekey: string | null
          content_source: string
          created_at: string
          creators_text: string
          csl: Json
          date_precision: string | null
          date_value: string | null
          deleted_at: string | null
          drive_file_id: string | null
          file_name: string | null
          file_sha256: string | null
          file_size: number | null
          has_text_layer: boolean | null
          id: string
          kind: string
          metadata: Json
          page_count: number | null
          revision: number
          search_vector: unknown
          sort_creator: string
          title: string
          type: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          anchor_item_id?: string | null
          body?: string | null
          citekey?: string | null
          content_source?: string
          created_at?: string
          creators_text?: string
          csl?: Json
          date_precision?: string | null
          date_value?: string | null
          deleted_at?: string | null
          drive_file_id?: string | null
          file_name?: string | null
          file_sha256?: string | null
          file_size?: number | null
          has_text_layer?: boolean | null
          id?: string
          kind: string
          metadata?: Json
          page_count?: number | null
          revision?: number
          search_vector?: unknown
          sort_creator?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Update: {
          anchor_item_id?: string | null
          body?: string | null
          citekey?: string | null
          content_source?: string
          created_at?: string
          creators_text?: string
          csl?: Json
          date_precision?: string | null
          date_value?: string | null
          deleted_at?: string | null
          drive_file_id?: string | null
          file_name?: string | null
          file_sha256?: string | null
          file_size?: number | null
          has_text_layer?: boolean | null
          id?: string
          kind?: string
          metadata?: Json
          page_count?: number | null
          revision?: number
          search_vector?: unknown
          sort_creator?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "items_anchor_item_id_fkey"
            columns: ["anchor_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      note_annotations: {
        Row: {
          annotation_id: string
          note_id: string
        }
        Insert: {
          annotation_id: string
          note_id: string
        }
        Update: {
          annotation_id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_annotations_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_annotations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          body: string | null
          created_at: string
          id: string
          note_id: string
          saved_at: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          note_id: string
          saved_at: string
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          note_id?: string
          saved_at?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          drive_connected: boolean
          email: string
          full_name: string | null
          id: string
          locale: string
          palette: Json
          source_types: string[]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          drive_connected?: boolean
          email: string
          full_name?: string | null
          id: string
          locale?: string
          palette?: Json
          source_types?: string[]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          drive_connected?: boolean
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          palette?: Json
          source_types?: string[]
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived: boolean
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived?: boolean
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          path: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          path: string
          user_id?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          path?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      annotation_tags_effective: {
        Row: {
          annotation_id: string | null
          inherited: boolean | null
          tag_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      next_citekey: { Args: { base: string }; Returns: string }
      owns_annotation: { Args: { target: string }; Returns: boolean }
      owns_item: { Args: { target: string }; Returns: boolean }
      owns_project: { Args: { target: string }; Returns: boolean }
      owns_tag: { Args: { target: string }; Returns: boolean }
      purge_trash: { Args: never; Returns: number }
      qipu_fold: { Args: { t: string }; Returns: string }
      search_library: {
        Args: { q: string }
        Returns: {
          item_id: string
          page: number
          rank: number
          snippet: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
