export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      posts: {
        Row: {
          caption: string | null;
          created_at: string;
          duration_sec: number | null;
          fts: unknown;
          height: number | null;
          id: string;
          media_type: string;
          media_url: string;
          poster_url: string | null;
          release_id: string | null;
          tags: string[];
          track_id: string | null;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          caption?: string | null;
          created_at?: string;
          duration_sec?: number | null;
          fts?: never;
          height?: number | null;
          id?: string;
          media_type: string;
          media_url: string;
          poster_url?: string | null;
          release_id?: string | null;
          tags?: string[];
          track_id?: string | null;
          width?: number | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          duration_sec?: number | null;
          fts?: never;
          height?: number | null;
          id?: string;
          media_type?: string;
          media_url?: string;
          poster_url?: string | null;
          release_id?: string | null;
          tags?: string[];
          track_id?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_release_id_fkey";
            columns: ["release_id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          id: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          id?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      releases: {
        Row: {
          cover_url: string;
          created_at: string;
          description: string | null;
          fts: unknown;
          id: string;
          links: NonNullable<Json>;
          release_date: string | null;
          title: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          cover_url: string;
          created_at?: string;
          description?: string | null;
          fts?: never;
          id?: string;
          links?: NonNullable<Json>;
          release_date?: string | null;
          title: string;
          type: string;
        };
        Update: {
          cover_url?: string;
          created_at?: string;
          description?: string | null;
          fts?: never;
          id?: string;
          links?: NonNullable<Json>;
          release_date?: string | null;
          title?: string;
          type?: string;
        };
        Relationships: [];
      };
      tracks: {
        Row: {
          audio_url: string;
          bpm: number | null;
          created_at: string;
          duration_sec: number | null;
          fts: unknown;
          id: string;
          musical_key: string | null;
          release_id: string;
          title: string;
          track_number: number | null;
        };
        ComputedFields: never;
        Insert: {
          audio_url: string;
          bpm?: number | null;
          created_at?: string;
          duration_sec?: number | null;
          fts?: never;
          id?: string;
          musical_key?: string | null;
          release_id: string;
          title: string;
          track_number?: number | null;
        };
        Update: {
          audio_url?: string;
          bpm?: number | null;
          created_at?: string;
          duration_sec?: number | null;
          fts?: never;
          id?: string;
          musical_key?: string | null;
          release_id?: string;
          title?: string;
          track_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_release_id_fkey";
            columns: ["release_id"];
            isOneToOne: false;
            referencedRelation: "releases";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
      feed_page: {
        Args: { p_kind?: string; p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: {
          kind: string;
          id: string;
          sort_at: string;
        }[];
      };
      on_this_day: {
        Args: { tz?: string };
        Returns: {
          happened_at: string;
          id: string;
          image_url: string;
          kind: string;
          media_type: string;
          title: string;
          years_ago: number;
        }[];
      };
      search_all: {
        Args: { q: string };
        Returns: {
          happened_at: string;
          id: string;
          image_url: string;
          kind: string;
          release_id: string;
          subtitle: string;
          title: string;
        }[];
      };
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

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
