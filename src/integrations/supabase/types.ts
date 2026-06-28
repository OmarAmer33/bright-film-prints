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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      builder_sessions: {
        Row: {
          antigro_session_id: string | null
          created_at: string
          customer_id: string | null
          dimensions: Json | null
          id: string
          jwt_ref: string | null
          print_file_url: string | null
          status: Database["public"]["Enums"]["builder_session_status"]
          updated_at: string
        }
        Insert: {
          antigro_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          dimensions?: Json | null
          id?: string
          jwt_ref?: string | null
          print_file_url?: string | null
          status?: Database["public"]["Enums"]["builder_session_status"]
          updated_at?: string
        }
        Update: {
          antigro_session_id?: string | null
          created_at?: string
          customer_id?: string | null
          dimensions?: Json | null
          id?: string
          jwt_ref?: string | null
          print_file_url?: string | null
          status?: Database["public"]["Enums"]["builder_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          rewards_balance: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          rewards_balance?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          rewards_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          builder_project_ref: string | null
          created_at: string
          dpi_ok: boolean | null
          id: string
          line_total: number
          notes: string | null
          order_id: string
          preview_url: string | null
          print_file_url: string | null
          processing_fee: number
          quantity: number
          size_ft: number
          source: Database["public"]["Enums"]["order_item_source"]
          unit_price: number
        }
        Insert: {
          builder_project_ref?: string | null
          created_at?: string
          dpi_ok?: boolean | null
          id?: string
          line_total: number
          notes?: string | null
          order_id: string
          preview_url?: string | null
          print_file_url?: string | null
          processing_fee?: number
          quantity: number
          size_ft: number
          source: Database["public"]["Enums"]["order_item_source"]
          unit_price: number
        }
        Update: {
          builder_project_ref?: string | null
          created_at?: string
          dpi_ok?: boolean | null
          id?: string
          line_total?: number
          notes?: string | null
          order_id?: string
          preview_url?: string | null
          print_file_url?: string | null
          processing_fee?: number
          quantity?: number
          size_ft?: number
          source?: Database["public"]["Enums"]["order_item_source"]
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          customer_id: string | null
          email: string
          guest_email_lookup_token: string | null
          id: string
          is_rush: boolean
          rewards_earned: number
          rewards_redeemed: number
          rush_fee: number
          shipping_address: Json | null
          shipping_fee: number
          status: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subtotal: number
          tax: number
          total: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          guest_email_lookup_token?: string | null
          id?: string
          is_rush?: boolean
          rewards_earned?: number
          rewards_redeemed?: number
          rush_fee?: number
          shipping_address?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          guest_email_lookup_token?: string | null
          id?: string
          is_rush?: boolean
          rewards_earned?: number
          rewards_redeemed?: number
          rush_fee?: number
          shipping_address?: Json | null
          shipping_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          active: boolean
          created_at: string
          id: string
          per_sqft: number
          price: number
          size_ft: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          per_sqft: number
          price: number
          size_ft: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          per_sqft?: number
          price?: number
          size_ft?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rewards_ledger: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          memo: string | null
          order_id: string | null
          type: Database["public"]["Enums"]["rewards_entry_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          id?: string
          memo?: string | null
          order_id?: string | null
          type: Database["public"]["Enums"]["rewards_entry_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          memo?: string | null
          order_id?: string | null
          type?: Database["public"]["Enums"]["rewards_entry_type"]
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          customer_id: string | null
          detected_dpi: number | null
          file_url: string
          height_px: number | null
          id: string
          order_item_id: string | null
          status: Database["public"]["Enums"]["upload_status"]
          width_px: number | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          detected_dpi?: number | null
          file_url: string
          height_px?: number | null
          id?: string
          order_item_id?: string | null
          status?: Database["public"]["Enums"]["upload_status"]
          width_px?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          detected_dpi?: number | null
          file_url?: string
          height_px?: number | null
          id?: string
          order_item_id?: string | null
          status?: Database["public"]["Enums"]["upload_status"]
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploads_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
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
      webhook_events: {
        Row: {
          event_id: string
          processed_at: string
          type: string
        }
        Insert: {
          event_id: string
          processed_at?: string
          type: string
        }
        Update: {
          event_id?: string
          processed_at?: string
          type?: string
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
    }
    Enums: {
      app_role: "admin" | "customer"
      builder_session_status:
        | "created"
        | "in_progress"
        | "accepted"
        | "file_ready"
        | "abandoned"
      order_item_source: "upload" | "builder"
      order_status:
        | "new"
        | "paid"
        | "in_production"
        | "printed"
        | "shipped"
        | "delivered"
        | "on_hold"
        | "issue"
      rewards_entry_type: "earn" | "redeem" | "adjust"
      upload_status: "pending" | "ok" | "low_res" | "rejected"
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
      app_role: ["admin", "customer"],
      builder_session_status: [
        "created",
        "in_progress",
        "accepted",
        "file_ready",
        "abandoned",
      ],
      order_item_source: ["upload", "builder"],
      order_status: [
        "new",
        "paid",
        "in_production",
        "printed",
        "shipped",
        "delivered",
        "on_hold",
        "issue",
      ],
      rewards_entry_type: ["earn", "redeem", "adjust"],
      upload_status: ["pending", "ok", "low_res", "rejected"],
    },
  },
} as const
