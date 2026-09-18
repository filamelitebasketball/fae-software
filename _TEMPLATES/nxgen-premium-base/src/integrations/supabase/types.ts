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
      admin_activity_log: {
        Row: {
          action: string
          actor_name: string | null
          actor_user_id: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_name?: string | null
          actor_user_id: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_name?: string | null
          actor_user_id?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_role_audit_log: {
        Row: {
          action: string
          changed_by_name: string | null
          changed_by_user_id: string | null
          created_at: string
          id: string
          reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_name: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          target_name?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          changed_by_name?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          target_name?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      bracelets: {
        Row: {
          active: boolean
          created_at: string
          id: string
          issued_at: string
          label: string | null
          uid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          issued_at?: string
          label?: string | null
          uid: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          issued_at?: string
          label?: string | null
          uid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cafe_sessions: {
        Row: {
          auth_method: string
          bracelet_uid: string | null
          created_at: string
          ended_at: string | null
          ended_by: string | null
          id: string
          ledger_entry_id: string | null
          notes: string | null
          rate_cents_per_hour: number
          started_at: string
          started_by: string | null
          station: string
          total_charge_cents: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_method?: string
          bracelet_uid?: string | null
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ledger_entry_id?: string | null
          notes?: string | null
          rate_cents_per_hour?: number
          started_at?: string
          started_by?: string | null
          station: string
          total_charge_cents?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_method?: string
          bracelet_uid?: string | null
          created_at?: string
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          ledger_entry_id?: string | null
          notes?: string | null
          rate_cents_per_hour?: number
          started_at?: string
          started_by?: string | null
          station?: string
          total_charge_cents?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cafe_sessions_ledger_entry_id_fkey"
            columns: ["ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "player_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      daily_ledgers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          ledger_date: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          total_sales_cents: number
          total_tab_cents: number
          total_topups_cents: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          ledger_date: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          total_sales_cents?: number
          total_tab_cents?: number
          total_topups_cents?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          ledger_date?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          total_sales_cents?: number
          total_tab_cents?: number
          total_topups_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donor_name: string
          id: string
          image_path: string | null
          message: string | null
          method: string
          reference_no: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shoutout_used: boolean
          shoutout_used_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          donor_name: string
          id?: string
          image_path?: string | null
          message?: string | null
          method?: string
          reference_no?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shoutout_used?: boolean
          shoutout_used_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          donor_name?: string
          id?: string
          image_path?: string | null
          message?: string | null
          method?: string
          reference_no?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shoutout_used?: boolean
          shoutout_used_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          caption: string | null
          created_at: string
          division: string | null
          game_night: string | null
          id: string
          image_path: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          division?: string | null
          game_night?: string | null
          id?: string
          image_path: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          division?: string | null
          game_night?: string | null
          id?: string
          image_path?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          away_team_name: string | null
          batch_id: string | null
          created_at: string
          division: string
          home_score: number | null
          home_team_id: string | null
          home_team_name: string | null
          id: string
          livestream_url: string | null
          notes: string | null
          recap_url: string | null
          scheduled_at: string
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          batch_id?: string | null
          created_at?: string
          division: string
          home_score?: number | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          livestream_url?: string | null
          notes?: string | null
          recap_url?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          away_team_name?: string | null
          batch_id?: string | null
          created_at?: string
          division?: string
          home_score?: number | null
          home_team_id?: string | null
          home_team_name?: string | null
          id?: string
          livestream_url?: string | null
          notes?: string | null
          recap_url?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          name: string
          notes: string | null
          price_cents: number
          sku: string | null
          stock: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          price_cents?: number
          sku?: string | null
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          price_cents?: number
          sku?: string | null
          stock?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kotc_bracket_matches: {
        Row: {
          created_at: string
          id: string
          player_a_id: string | null
          player_a_name: string | null
          player_b_id: string | null
          player_b_name: string | null
          round: number
          scheduled_at: string | null
          slot: number
          updated_at: string
          winner: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          player_a_id?: string | null
          player_a_name?: string | null
          player_b_id?: string | null
          player_b_name?: string | null
          round: number
          scheduled_at?: string | null
          slot: number
          updated_at?: string
          winner?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          player_a_id?: string | null
          player_a_name?: string | null
          player_b_id?: string | null
          player_b_name?: string | null
          round?: number
          scheduled_at?: string | null
          slot?: number
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      managed_players: {
        Row: {
          consent_status: string
          consent_token: string | null
          created_at: string
          date_of_birth: string | null
          division: string | null
          full_name: string
          guardian_consent_at: string | null
          guardian_email: string | null
          guardian_full_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          guardian_signature: string | null
          id: string
          is_minor: boolean
          jersey_number: string | null
          notes: string | null
          parent_user_id: string
          photo_url: string | null
          position: string | null
          status: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          full_name: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_signature?: string | null
          id?: string
          is_minor?: boolean
          jersey_number?: string | null
          notes?: string | null
          parent_user_id: string
          photo_url?: string | null
          position?: string | null
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          full_name?: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_signature?: string | null
          id?: string
          is_minor?: boolean
          jersey_number?: string | null
          notes?: string | null
          parent_user_id?: string
          photo_url?: string | null
          position?: string | null
          status?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          image_path: string
          method: Database["public"]["Enums"]["payment_proof_method"]
          notes: string | null
          purpose: Database["public"]["Enums"]["payment_proof_purpose"]
          reference_no: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_proof_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          image_path: string
          method: Database["public"]["Enums"]["payment_proof_method"]
          notes?: string | null
          purpose: Database["public"]["Enums"]["payment_proof_purpose"]
          reference_no?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          image_path?: string
          method?: Database["public"]["Enums"]["payment_proof_method"]
          notes?: string | null
          purpose?: Database["public"]["Enums"]["payment_proof_purpose"]
          reference_no?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_proof_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_ledger_entries: {
        Row: {
          amount_cents: number
          bracelet_uid: string | null
          created_at: string
          daily_ledger_id: string | null
          description: string | null
          entry_type: string
          id: string
          item_id: string | null
          payment_method: string
          quantity: number
          recorded_by: string | null
          reverses_id: string | null
          user_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          amount_cents: number
          bracelet_uid?: string | null
          created_at?: string
          daily_ledger_id?: string | null
          description?: string | null
          entry_type: string
          id?: string
          item_id?: string | null
          payment_method: string
          quantity?: number
          recorded_by?: string | null
          reverses_id?: string | null
          user_id: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          amount_cents?: number
          bracelet_uid?: string | null
          created_at?: string
          daily_ledger_id?: string | null
          description?: string | null
          entry_type?: string
          id?: string
          item_id?: string | null
          payment_method?: string
          quantity?: number
          recorded_by?: string | null
          reverses_id?: string | null
          user_id?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_ledger_entries_daily_ledger_id_fkey"
            columns: ["daily_ledger_id"]
            isOneToOne: false
            referencedRelation: "daily_ledgers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ledger_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_ledger_entries_reverses_id_fkey"
            columns: ["reverses_id"]
            isOneToOne: false
            referencedRelation: "player_ledger_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      player_of_the_game: {
        Row: {
          created_at: string
          created_by: string | null
          division: string
          game_id: string | null
          id: string
          image_url: string | null
          notes: string | null
          player_id: string | null
          player_name: string
          post_date: string
          post_url: string | null
          stat_line: string | null
          team: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          division: string
          game_id?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          player_id?: string | null
          player_name: string
          post_date?: string
          post_url?: string | null
          stat_line?: string | null
          team?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          division?: string
          game_id?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          player_id?: string | null
          player_name?: string
          post_date?: string
          post_url?: string | null
          stat_line?: string | null
          team?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_of_the_game_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_of_the_game_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          assists: number
          blocks: number
          created_at: string
          division: string
          game_id: string
          id: string
          minutes: number | null
          player_id: string
          points: number
          rebounds: number
          steals: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          assists?: number
          blocks?: number
          created_at?: string
          division: string
          game_id: string
          id?: string
          minutes?: number | null
          player_id: string
          points?: number
          rebounds?: number
          steals?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          assists?: number
          blocks?: number
          created_at?: string
          division?: string
          game_id?: string
          id?: string
          minutes?: number | null
          player_id?: string
          points?: number
          rebounds?: number
          steals?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wallets: {
        Row: {
          balance_cents: number
          created_at: string
          credit_limit_cents: number
          loyal_tab_enabled: boolean
          tab_balance_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          credit_limit_cents?: number
          loyal_tab_enabled?: boolean
          tab_balance_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          credit_limit_cents?: number
          loyal_tab_enabled?: boolean
          tab_balance_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          bio: string | null
          created_at: string
          division: string
          games_played: number
          id: string
          jersey_number: string | null
          name: string
          photo_url: string | null
          position: string | null
          profile_id: string | null
          season_ast: number
          season_blk: number
          season_pts: number
          season_reb: number
          season_stl: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          division: string
          games_played?: number
          id?: string
          jersey_number?: string | null
          name: string
          photo_url?: string | null
          position?: string | null
          profile_id?: string | null
          season_ast?: number
          season_blk?: number
          season_pts?: number
          season_reb?: number
          season_stl?: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          division?: string
          games_played?: number
          id?: string
          jersey_number?: string | null
          name?: string
          photo_url?: string | null
          position?: string | null
          profile_id?: string | null
          season_ast?: number
          season_blk?: number
          season_pts?: number
          season_reb?: number
          season_stl?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bio: string | null
          consent_status: string
          consent_token: string | null
          created_at: string
          date_of_birth: string | null
          division: string | null
          facebook_handle: string | null
          full_name: string | null
          guardian_consent_at: string | null
          guardian_email: string | null
          guardian_full_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          guardian_signature: string | null
          height_cm: number | null
          highlights: Json
          id: string
          instagram_handle: string | null
          is_minor: boolean
          is_public: boolean
          jersey_number: string | null
          membership_tier: string
          phone: string | null
          photo_url: string | null
          position: string | null
          stats: Json
          tiktok_handle: string | null
          twitter_handle: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          facebook_handle?: string | null
          full_name?: string | null
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_signature?: string | null
          height_cm?: number | null
          highlights?: Json
          id: string
          instagram_handle?: string | null
          is_minor?: boolean
          is_public?: boolean
          jersey_number?: string | null
          membership_tier?: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          stats?: Json
          tiktok_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string | null
          consent_status?: string
          consent_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          division?: string | null
          facebook_handle?: string | null
          full_name?: string | null
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          guardian_signature?: string | null
          height_cm?: number | null
          highlights?: Json
          id?: string
          instagram_handle?: string | null
          is_minor?: boolean
          is_public?: boolean
          jersey_number?: string | null
          membership_tier?: string
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          stats?: Json
          tiktok_handle?: string | null
          twitter_handle?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_notes: string | null
          approved_amount_cents: number | null
          created_at: string
          division: string
          id: string
          notes: string | null
          reason: string
          registration_id: string | null
          resolution_preference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_amount_cents?: number | null
          created_at?: string
          division: string
          id?: string
          notes?: string | null
          reason: string
          registration_id?: string | null
          resolution_preference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_amount_cents?: number | null
          created_at?: string
          division?: string
          id?: string
          notes?: string | null
          reason?: string
          registration_id?: string | null
          resolution_preference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_roster_members: {
        Row: {
          coach_user_id: string
          created_at: string
          division: string
          full_name: string
          id: string
          jersey_number: string | null
          position: string | null
          registration_id: string
          team_name: string
          updated_at: string
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          division: string
          full_name: string
          id?: string
          jersey_number?: string | null
          position?: string | null
          registration_id: string
          team_name: string
          updated_at?: string
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          division?: string
          full_name?: string
          id?: string
          jersey_number?: string | null
          position?: string | null
          registration_id?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_roster_members_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          applicant_type: string
          coach_bio: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          division: string
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          facebook_handle: string | null
          full_name: string
          guardian_consent_at: string | null
          guardian_email: string | null
          guardian_full_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          id: string
          instagram_handle: string | null
          jersey_number: number | null
          jersey_size: string | null
          managed_player_id: string | null
          notes: string | null
          phone: string
          position: string | null
          status: string
          team_name: string | null
          tiktok_handle: string | null
          twitter_handle: string | null
          user_id: string
        }
        Insert: {
          applicant_type?: string
          coach_bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          division: string
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_handle?: string | null
          full_name: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          instagram_handle?: string | null
          jersey_number?: number | null
          jersey_size?: string | null
          managed_player_id?: string | null
          notes?: string | null
          phone: string
          position?: string | null
          status?: string
          team_name?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          user_id: string
        }
        Update: {
          applicant_type?: string
          coach_bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          division?: string
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          facebook_handle?: string | null
          full_name?: string
          guardian_consent_at?: string | null
          guardian_email?: string | null
          guardian_full_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          id?: string
          instagram_handle?: string | null
          jersey_number?: number | null
          jersey_size?: string | null
          managed_player_id?: string | null
          notes?: string | null
          phone?: string
          position?: string | null
          status?: string
          team_name?: string | null
          tiktok_handle?: string | null
          twitter_handle?: string | null
          user_id?: string
        }
        Relationships: []
      }
      season_champions: {
        Row: {
          champion: string | null
          created_at: string
          division: string
          id: string
          mvp: string | null
          runner_up: string | null
          season_id: string
        }
        Insert: {
          champion?: string | null
          created_at?: string
          division: string
          id?: string
          mvp?: string | null
          runner_up?: string | null
          season_id: string
        }
        Update: {
          champion?: string | null
          created_at?: string
          division?: string
          id?: string
          mvp?: string | null
          runner_up?: string | null
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_champions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          name: string
          stats_url: string | null
          status: string
          summary: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          stats_url?: string | null
          status?: string
          summary?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stats_url?: string | null
          status?: string
          summary?: string | null
          year?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      sponsor_inquiries: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      stat_edit_history: {
        Row: {
          action: string
          after_values: Json | null
          before_values: Json | null
          created_at: string
          editor_name: string | null
          editor_user_id: string | null
          game_id: string | null
          id: string
          player_id: string | null
          stat_id: string | null
        }
        Insert: {
          action: string
          after_values?: Json | null
          before_values?: Json | null
          created_at?: string
          editor_name?: string | null
          editor_user_id?: string | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          stat_id?: string | null
        }
        Update: {
          action?: string
          after_values?: Json | null
          before_values?: Json | null
          created_at?: string
          editor_name?: string | null
          editor_user_id?: string | null
          game_id?: string | null
          id?: string
          player_id?: string | null
          stat_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          coach_id: string | null
          color: string | null
          created_at: string
          division: string
          id: string
          logo_url: string | null
          losses: number
          name: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          submitted_by: string | null
          updated_at: string
          wins: number
        }
        Insert: {
          coach_id?: string | null
          color?: string | null
          created_at?: string
          division: string
          id?: string
          logo_url?: string | null
          losses?: number
          name: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
          wins?: number
        }
        Update: {
          coach_id?: string | null
          color?: string | null
          created_at?: string
          division?: string
          id?: string
          logo_url?: string | null
          losses?: number
          name?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          submitted_by?: string | null
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          protected: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          protected?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          protected?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard_totals: {
        Row: {
          apg: number | null
          avatar_url: string | null
          bpg: number | null
          division: string | null
          full_name: string | null
          games_played: number | null
          jersey_number: string | null
          photo_url: string | null
          player_id: string | null
          ppg: number | null
          rpg: number | null
          spg: number | null
          total_assists: number | null
          total_blocks: number | null
          total_points: number | null
          total_rebounds: number | null
          total_steals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_wallet_delta: {
        Args: {
          _actor?: string
          _balance_delta?: number
          _tab_delta?: number
          _user_id: string
        }
        Returns: {
          balance_cents: number
          created_at: string
          credit_limit_cents: number
          loyal_tab_enabled: boolean
          tab_balance_cents: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_consent_request: {
        Args: { _token: string }
        Returns: {
          division: string
          guardian_email: string
          guardian_full_name: string
          kind: string
          player_name: string
          status: string
        }[]
      }
      get_profile_by_bracelet_uid: {
        Args: { _uid: string }
        Returns: {
          is_public: boolean
          profile_id: string
        }[]
      }
      get_public_player: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          bio: string
          division: string
          facebook_handle: string
          full_name: string
          height_cm: number
          highlights: Json
          id: string
          instagram_handle: string
          is_public: boolean
          jersey_number: string
          photo_url: string
          position: string
          tiktok_handle: string
          twitter_handle: string
          weight_kg: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_public_player: { Args: { _player_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      recalc_player_season_totals: {
        Args: { _profile_id: string }
        Returns: undefined
      }
      submit_parental_consent: {
        Args: {
          _email: string
          _guardian_name: string
          _phone: string
          _relationship: string
          _signature: string
          _token: string
        }
        Returns: boolean
      }
      void_ledger_entry: {
        Args: { _actor?: string; _entry_id: string; _reason?: string }
        Returns: {
          amount_cents: number
          bracelet_uid: string | null
          created_at: string
          daily_ledger_id: string | null
          description: string | null
          entry_type: string
          id: string
          item_id: string | null
          payment_method: string
          quantity: number
          recorded_by: string | null
          reverses_id: string | null
          user_id: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "player_ledger_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "coach"
      payment_proof_method: "gcash" | "maya" | "bank" | "other"
      payment_proof_purpose:
        | "wallet_topup"
        | "merchandise"
        | "drinks"
        | "registration"
        | "other"
      payment_proof_status: "pending" | "approved" | "rejected"
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
    Enums: {
      app_role: ["admin", "user", "manager", "coach"],
      payment_proof_method: ["gcash", "maya", "bank", "other"],
      payment_proof_purpose: [
        "wallet_topup",
        "merchandise",
        "drinks",
        "registration",
        "other",
      ],
      payment_proof_status: ["pending", "approved", "rejected"],
    },
  },
} as const
