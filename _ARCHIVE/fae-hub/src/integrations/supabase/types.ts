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
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          amount: number
          channel: string | null
          court_id: string
          created_at: string | null
          date: string
          hours: number
          id: string
          member_id: string | null
          ref: string | null
          sport: string
          start_hour: number
          status: string | null
        }
        Insert: {
          amount: number
          channel?: string | null
          court_id: string
          created_at?: string | null
          date: string
          hours?: number
          id?: string
          member_id?: string | null
          ref?: string | null
          sport: string
          start_hour: number
          status?: string | null
        }
        Update: {
          amount?: number
          channel?: string | null
          court_id?: string
          created_at?: string | null
          date?: string
          hours?: number
          id?: string
          member_id?: string | null
          ref?: string | null
          sport?: string
          start_hour?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string
          id: string
          name: string
          par_level: number | null
          price: number
          sku: string
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          id?: string
          name: string
          par_level?: number | null
          price: number
          sku: string
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          id?: string
          name?: string
          par_level?: number | null
          price?: number
          sku?: string
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      members: {
        Row: {
          band_id: string | null
          email: string
          id: string
          joined_at: string | null
          name: string
          phone: string | null
          provider: string | null
          role: string | null
          sport: string | null
          tier: string | null
          user_id: string | null
        }
        Insert: {
          band_id?: string | null
          email: string
          id?: string
          joined_at?: string | null
          name: string
          phone?: string | null
          provider?: string | null
          role?: string | null
          sport?: string | null
          tier?: string | null
          user_id?: string | null
        }
        Update: {
          band_id?: string | null
          email?: string
          id?: string
          joined_at?: string | null
          name?: string
          phone?: string | null
          provider?: string | null
          role?: string | null
          sport?: string | null
          tier?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          item_id: string | null
          member_id: string | null
          name: string
          qty: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          member_id?: string | null
          name: string
          qty?: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          item_id?: string | null
          member_id?: string | null
          name?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      tabs: {
        Row: {
          created_at: string | null
          id: string
          items: Json | null
          member_id: string | null
          settled: boolean | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          items?: Json | null
          member_id?: string | null
          settled?: boolean | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          items?: Json | null
          member_id?: string | null
          settled?: boolean | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tabs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      tryouts: {
        Row: {
          created_at: string | null
          id: string
          member_id: string
          sport: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          member_id: string
          sport: string
        }
        Update: {
          created_at?: string | null
          id?: string
          member_id?: string
          sport?: string
        }
        Relationships: [
          {
            foreignKeyName: "tryouts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      claim_admin_if_first: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      taken_hours: {
        Args: { _court_id: string; _date: string }
        Returns: {
          hours: number
          start_hour: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "member"
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
      app_role: ["admin", "staff", "member"],
    },
  },
} as const
