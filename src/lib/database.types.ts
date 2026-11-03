export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  codex: {
    Tables: {
      ai_consents: {
        Row: {
          consented_at: string;
          policy_version: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          consented_at?: string;
          policy_version: string;
          user_id?: string;
        };
        Update: {
          consented_at?: string;
          policy_version?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          created_at: string;
          id: string;
          space_id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          space_id: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          space_id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id?: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_user_id_fkey";
            columns: ["conversation_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "ai_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          category_id: string;
          category_type: string;
          created_at: string;
          id: string;
          limit_amount: number | string;
          month: string;
          space_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category_id: string;
          category_type?: string;
          created_at?: string;
          id?: string;
          limit_amount: number | string;
          month: string;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          category_type?: string;
          created_at?: string;
          id?: string;
          limit_amount?: number | string;
          month?: string;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_space_id_category_type_fkey";
            columns: ["category_id", "space_id", "category_type"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "space_id", "type"];
          },
          {
            foreignKeyName: "budgets_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          icon: string;
          id: string;
          name: string;
          space_id: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          name: string;
          space_id: string;
          type: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          icon?: string;
          id?: string;
          name?: string;
          space_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          onboarded_at: string | null;
          view_preference: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          onboarded_at?: string | null;
          view_preference?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          onboarded_at?: string | null;
          view_preference?: string;
        };
        Relationships: [];
      };
      space_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          revoked_at: string | null;
          space_id: string;
          token_hash: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          revoked_at?: string | null;
          space_id: string;
          token_hash: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          revoked_at?: string | null;
          space_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_invitations_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
      space_members: {
        Row: {
          joined_at: string;
          role: string;
          space_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          joined_at?: string;
          role: string;
          space_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          role?: string;
          space_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_members_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "space_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      spaces: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          type: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          type?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number | string;
          category_id: string;
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          occurred_on: string;
          space_id: string;
          type: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number | string;
          category_id: string;
          created_at?: string;
          created_by?: string;
          description: string;
          id?: string;
          occurred_on: string;
          space_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          amount?: number | string;
          category_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          occurred_on?: string;
          space_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_space_id_type_fkey";
            columns: ["category_id", "space_id", "type"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "space_id", "type"];
          },
          {
            foreignKeyName: "transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_space_id_fkey";
            columns: ["space_id"];
            isOneToOne: false;
            referencedRelation: "spaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string };
      budget_report: {
        Args: { p_month: string; p_space_id: string };
        Returns: Json;
      };
      complete_onboarding: {
        Args: {
          p_name: string;
          p_preference: string;
          p_shared_name?: string;
          p_shared_type?: string;
        };
        Returns: undefined;
      };
      create_invitation: {
        Args: { p_email: string; p_space_id: string };
        Returns: string;
      };
      create_space: {
        Args: { p_name: string; p_type: string };
        Returns: string;
      };
      ensure_profile: { Args: Record<PropertyKey, never>; Returns: undefined };
      financial_report: {
        Args: { p_end: string; p_space_id: string; p_start: string };
        Returns: Json;
      };
      initialize_profile: {
        Args: { p_name: string; p_user_id: string };
        Returns: undefined;
      };
      is_member: { Args: { p_space_id: string }; Returns: boolean };
      is_owner: { Args: { p_space_id: string }; Returns: boolean };
      list_members: {
        Args: { p_space_id: string };
        Returns: {
          full_name: string;
          joined_at: string;
          role: string;
          user_id: string;
        }[];
      };
      owns_conversation: { Args: { p_id: string }; Returns: boolean };
      remove_member: {
        Args: { p_space_id: string; p_user_id: string };
        Returns: undefined;
      };
      seed_categories: { Args: { p_space_id: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "codex">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  codex: {
    Enums: {},
  },
} as const;
