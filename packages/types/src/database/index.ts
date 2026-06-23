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
      activity_feed: {
        Row: {
          actor_profile_id: string | null
          competition_event_id: string | null
          competition_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          result_id: string | null
          subject_profile_id: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          competition_event_id?: string | null
          competition_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          result_id?: string | null
          subject_profile_id?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          competition_event_id?: string | null
          competition_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          result_id?: string | null
          subject_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_feed_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      career_stats: {
        Row: {
          bronze_count: number
          gold_count: number
          mvp_count: number
          profile_id: string
          silver_count: number
          total_competitions: number
          total_events: number
          total_points: number
          updated_at: string
        }
        Insert: {
          bronze_count?: number
          gold_count?: number
          mvp_count?: number
          profile_id: string
          silver_count?: number
          total_competitions?: number
          total_events?: number
          total_points?: number
          updated_at?: string
        }
        Update: {
          bronze_count?: number
          gold_count?: number
          mvp_count?: number
          profile_id?: string
          silver_count?: number
          total_competitions?: number
          total_events?: number
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "career_stats_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_event_participants: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          competition_event_id: string
          profile_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          competition_event_id: string
          profile_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          competition_event_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_event_participants_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_event_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_events: {
        Row: {
          cancelled_reason: string | null
          competition_id: string
          confirmed_at: string | null
          dispute_window_closes_at: string | null
          event_id: string
          id: string
          name_override: string | null
          scheduled_at: string | null
          sequence_order: number
          started_at: string | null
          status: Database["public"]["Enums"]["competition_event_status"]
          weight_multiplier: number
          weight_tag: Database["public"]["Enums"]["weight_tag"]
        }
        Insert: {
          cancelled_reason?: string | null
          competition_id: string
          confirmed_at?: string | null
          dispute_window_closes_at?: string | null
          event_id: string
          id?: string
          name_override?: string | null
          scheduled_at?: string | null
          sequence_order: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_event_status"]
          weight_multiplier?: number
          weight_tag?: Database["public"]["Enums"]["weight_tag"]
        }
        Update: {
          cancelled_reason?: string | null
          competition_id?: string
          confirmed_at?: string | null
          dispute_window_closes_at?: string | null
          event_id?: string
          id?: string
          name_override?: string | null
          scheduled_at?: string | null
          sequence_order?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_event_status"]
          weight_multiplier?: number
          weight_tag?: Database["public"]["Enums"]["weight_tag"]
        }
        Relationships: [
          {
            foreignKeyName: "competition_events_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_members: {
        Row: {
          bronze_count: number
          competition_id: string
          events_completed: number
          final_rank: number | null
          gold_count: number
          id: string
          joined_at: string | null
          profile_id: string
          role: Database["public"]["Enums"]["member_role"]
          silver_count: number
          status: Database["public"]["Enums"]["member_status"]
          total_points: number
        }
        Insert: {
          bronze_count?: number
          competition_id: string
          events_completed?: number
          final_rank?: number | null
          gold_count?: number
          id?: string
          joined_at?: string | null
          profile_id: string
          role?: Database["public"]["Enums"]["member_role"]
          silver_count?: number
          status?: Database["public"]["Enums"]["member_status"]
          total_points?: number
        }
        Update: {
          bronze_count?: number
          competition_id?: string
          events_completed?: number
          final_rank?: number | null
          gold_count?: number
          id?: string
          joined_at?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          silver_count?: number
          status?: Database["public"]["Enums"]["member_status"]
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "competition_members_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competition_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          city: string | null
          cohost_id: string | null
          completed_at: string | null
          country_code: string | null
          created_at: string
          description: string | null
          host_id: string
          id: string
          invite_code: string | null
          is_public: boolean
          min_events_required: number
          mvp_voting_enabled: boolean
          name: string
          parent_competition_id: string | null
          prize_pot_per_person: number | null
          season_number: number
          started_at: string | null
          status: Database["public"]["Enums"]["competition_status"]
          total_events: number
          voting_locked: boolean
          worst_performer_enabled: boolean
        }
        Insert: {
          city?: string | null
          cohost_id?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          invite_code?: string | null
          is_public?: boolean
          min_events_required?: number
          mvp_voting_enabled?: boolean
          name: string
          parent_competition_id?: string | null
          prize_pot_per_person?: number | null
          season_number?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
          total_events?: number
          voting_locked?: boolean
          worst_performer_enabled?: boolean
        }
        Update: {
          city?: string | null
          cohost_id?: string | null
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          invite_code?: string | null
          is_public?: boolean
          min_events_required?: number
          mvp_voting_enabled?: boolean
          name?: string
          parent_competition_id?: string | null
          prize_pot_per_person?: number | null
          season_number?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["competition_status"]
          total_events?: number
          voting_locked?: boolean
          worst_performer_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "competitions_cohost_id_fkey"
            columns: ["cohost_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_parent_competition_id_fkey"
            columns: ["parent_competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          icon_url: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          icon_url?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          icon_url?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      event_points_config: {
        Row: {
          competition_id: string | null
          finishing_place: number
          id: string
          points_value: number
        }
        Insert: {
          competition_id?: string | null
          finishing_place: number
          id?: string
          points_value: number
        }
        Update: {
          competition_id?: string | null
          finishing_place?: number
          id?: string
          points_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_points_config_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_custom: boolean
          is_team_event: boolean
          max_team_size: number | null
          min_team_size: number | null
          name: string
          result_type: Database["public"]["Enums"]["result_type"]
          scoring_notes: string | null
          similarity_group: string | null
          slug: string
        }
        Insert: {
          category_id: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_team_event?: boolean
          max_team_size?: number | null
          min_team_size?: number | null
          name: string
          result_type: Database["public"]["Enums"]["result_type"]
          scoring_notes?: string | null
          similarity_group?: string | null
          slug: string
        }
        Update: {
          category_id?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_custom?: boolean
          is_team_event?: boolean
          max_team_size?: number | null
          min_team_size?: number | null
          name?: string
          result_type?: Database["public"]["Enums"]["result_type"]
          scoring_notes?: string | null
          similarity_group?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_comments: {
        Row: {
          content: string
          created_at: string
          feed_item_id: string
          id: string
          profile_id: string
        }
        Insert: {
          content: string
          created_at?: string
          feed_item_id: string
          id?: string
          profile_id: string
        }
        Update: {
          content?: string
          created_at?: string
          feed_item_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_comments_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          competition_id: string | null
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: Database["public"]["Enums"]["message_type"]
          recipient_profile_id: string | null
          sender_profile_id: string
        }
        Insert: {
          competition_id?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type: Database["public"]["Enums"]["message_type"]
          recipient_profile_id?: string | null
          sender_profile_id: string
        }
        Update: {
          competition_id?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          recipient_profile_id?: string | null
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          profile_id: string
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_vote_results: {
        Row: {
          applied_at: string
          bonus_points: number
          competition_event_id: string
          id: string
          vote_count: number
          vote_type: Database["public"]["Enums"]["vote_type"]
          winner_profile_id: string
        }
        Insert: {
          applied_at?: string
          bonus_points: number
          competition_event_id: string
          id?: string
          vote_count: number
          vote_type: Database["public"]["Enums"]["vote_type"]
          winner_profile_id: string
        }
        Update: {
          applied_at?: string
          bonus_points?: number
          competition_event_id?: string
          id?: string
          vote_count?: number
          vote_type?: Database["public"]["Enums"]["vote_type"]
          winner_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_vote_results_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_vote_results_winner_profile_id_fkey"
            columns: ["winner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_votes: {
        Row: {
          competition_event_id: string
          created_at: string
          id: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          voted_for_profile_id: string
          voter_profile_id: string
        }
        Insert: {
          competition_event_id: string
          created_at?: string
          id?: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          voted_for_profile_id: string
          voter_profile_id: string
        }
        Update: {
          competition_event_id?: string
          created_at?: string
          id?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
          voted_for_profile_id?: string
          voter_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_votes_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_votes_voted_for_profile_id_fkey"
            columns: ["voted_for_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_votes_voter_profile_id_fkey"
            columns: ["voter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_bests: {
        Row: {
          achieved_at: string
          competition_event_id: string | null
          event_id: string
          id: string
          profile_id: string
          result_value_primary: number
          result_value_secondary: number | null
        }
        Insert: {
          achieved_at: string
          competition_event_id?: string | null
          event_id: string
          id?: string
          profile_id: string
          result_value_primary: number
          result_value_secondary?: number | null
        }
        Update: {
          achieved_at?: string
          competition_event_id?: string | null
          event_id?: string
          id?: string
          profile_id?: string
          result_value_primary?: number
          result_value_secondary?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_bests_competition_event_fk"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_bests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_bests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          claimed_at: string | null
          claimed_by: string | null
          country_code: string | null
          created_at: string
          display_name: string
          favourite_sport: string | null
          id: string
          is_ghost: boolean
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          country_code?: string | null
          created_at?: string
          display_name: string
          favourite_sport?: string | null
          id?: string
          is_ghost?: boolean
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string
          favourite_sport?: string | null
          id?: string
          is_ghost?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          profile_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          profile_id: string
          token: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          profile_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          profile_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["reaction_target_type"]
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          profile_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["reaction_target_type"]
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          profile_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["reaction_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          competition_id: string | null
          created_at: string
          id: string
          reason: string
          reporter_profile_id: string
          resolution_action: string | null
          resolved_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          competition_id?: string | null
          created_at?: string
          id?: string
          reason: string
          reporter_profile_id: string
          resolution_action?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          competition_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          reporter_profile_id?: string
          resolution_action?: string | null
          resolved_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      result_disputes: {
        Row: {
          created_at: string
          id: string
          raised_by: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          result_id: string
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          raised_by: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          result_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          created_at?: string
          id?: string
          raised_by?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          result_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "result_disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_disputes_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          competition_event_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          evidence_url: string | null
          finishing_place: number | null
          id: string
          is_disqualified: boolean
          is_dnf: boolean
          notes: string | null
          participation_points: number | null
          points_awarded: number | null
          profile_id: string
          result_value_primary: number | null
          result_value_secondary: number | null
          submitted_at: string
          submitted_by: string
          team_id: string | null
        }
        Insert: {
          competition_event_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          evidence_url?: string | null
          finishing_place?: number | null
          id?: string
          is_disqualified?: boolean
          is_dnf?: boolean
          notes?: string | null
          participation_points?: number | null
          points_awarded?: number | null
          profile_id: string
          result_value_primary?: number | null
          result_value_secondary?: number | null
          submitted_at?: string
          submitted_by: string
          team_id?: string | null
        }
        Update: {
          competition_event_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          evidence_url?: string | null
          finishing_place?: number | null
          id?: string
          is_disqualified?: boolean
          is_dnf?: boolean
          notes?: string | null
          participation_points?: number | null
          points_awarded?: number | null
          profile_id?: string
          result_value_primary?: number | null
          result_value_secondary?: number | null
          submitted_at?: string
          submitted_by?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "results_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      strength_rating_votes: {
        Row: {
          created_at: string
          id: string
          submission_round: number
          team_member_id: string
          vote: Database["public"]["Enums"]["strength_vote"]
          voter_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_round: number
          team_member_id: string
          vote: Database["public"]["Enums"]["strength_vote"]
          voter_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_round?: number
          team_member_id?: string
          vote?: Database["public"]["Enums"]["strength_vote"]
          voter_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strength_rating_votes_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_rating_votes_voter_profile_id_fkey"
            columns: ["voter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          confirmed_at: string | null
          id: string
          profile_id: string
          rating_source: Database["public"]["Enums"]["rating_source"]
          strength_rating: number
          team_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          profile_id: string
          rating_source: Database["public"]["Enums"]["rating_source"]
          strength_rating: number
          team_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          profile_id?: string
          rating_source?: Database["public"]["Enums"]["rating_source"]
          strength_rating?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          competition_event_id: string
          created_at: string
          id: string
          name: string
          result_place: number | null
          total_strength: number | null
        }
        Insert: {
          competition_event_id: string
          created_at?: string
          id?: string
          name: string
          result_place?: number | null
          total_strength?: number | null
        }
        Update: {
          competition_event_id?: string
          created_at?: string
          id?: string
          name?: string
          result_place?: number | null
          total_strength?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
        ]
      }
      tiebreaker_nominations: {
        Row: {
          id: string
          nominated_event_id: string
          nominating_profile_id: string
          revealed_at: string | null
          submitted_at: string
          tiebreaker_id: string
        }
        Insert: {
          id?: string
          nominated_event_id: string
          nominating_profile_id: string
          revealed_at?: string | null
          submitted_at?: string
          tiebreaker_id: string
        }
        Update: {
          id?: string
          nominated_event_id?: string
          nominating_profile_id?: string
          revealed_at?: string | null
          submitted_at?: string
          tiebreaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiebreaker_nominations_nominated_event_id_fkey"
            columns: ["nominated_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreaker_nominations_nominating_profile_id_fkey"
            columns: ["nominating_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreaker_nominations_tiebreaker_id_fkey"
            columns: ["tiebreaker_id"]
            isOneToOne: false
            referencedRelation: "tiebreakers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiebreakers: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          profile_id_a: string
          profile_id_b: string
          resolved_by:
          | Database["public"]["Enums"]["tiebreaker_resolved_by"]
          | null
          status: Database["public"]["Enums"]["tiebreaker_status"]
          winner_profile_id: string | null
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          profile_id_a: string
          profile_id_b: string
          resolved_by?:
          | Database["public"]["Enums"]["tiebreaker_resolved_by"]
          | null
          status?: Database["public"]["Enums"]["tiebreaker_status"]
          winner_profile_id?: string | null
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          profile_id_a?: string
          profile_id_b?: string
          resolved_by?:
          | Database["public"]["Enums"]["tiebreaker_resolved_by"]
          | null
          status?: Database["public"]["Enums"]["tiebreaker_status"]
          winner_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tiebreakers_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreakers_profile_id_a_fkey"
            columns: ["profile_id_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreakers_profile_id_b_fkey"
            columns: ["profile_id_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiebreakers_winner_profile_id_fkey"
            columns: ["winner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weightlifting_bids: {
        Row: {
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          bid_round: number
          bid_weight_kg: number
          competition_event_id: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          attempt_status?: Database["public"]["Enums"]["attempt_status"]
          bid_round: number
          bid_weight_kg: number
          competition_event_id: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          attempt_status?: Database["public"]["Enums"]["attempt_status"]
          bid_round?: number
          bid_weight_kg?: number
          competition_event_id?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weightlifting_bids_competition_event_id_fkey"
            columns: ["competition_event_id"]
            isOneToOne: false
            referencedRelation: "competition_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weightlifting_bids_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_competition_total_events: {
        Args: { p_competition_id: string }
        Returns: undefined
      }
      generate_invite_code: { Args: never; Returns: string }
      increment_competition_total_events: {
        Args: { p_competition_id: string }
        Returns: undefined
      }
      is_competition_host: { Args: { comp_id: string }; Returns: boolean }
      is_competition_member: { Args: { comp_id: string }; Returns: boolean }
      recalculate_member_score: {
        Args: { p_competition_id: string; p_profile_id: string }
        Returns: undefined
      }
      update_career_stats: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      update_personal_best: {
        Args: {
          p_competition_event_id: string
          p_event_id: string
          p_profile_id: string
          p_result_type: string
          p_result_value_primary: number
          p_result_value_secondary: number
        }
        Returns: undefined
      }
    }
    Enums: {
      attempt_status: "pending" | "success" | "fail" | "withdrawn"
      competition_event_status:
      | "pending"
      | "active"
      | "results_pending"
      | "disputed"
      | "confirmed"
      | "cancelled"
      competition_status: "setup" | "open" | "active" | "complete" | "archived"
      dispute_status: "open" | "resolved" | "dismissed"
      member_role: "competitor" | "spectator" | "cohost"
      member_status: "invited" | "active" | "withdrawn"
      message_type: "group_chat" | "direct_message"
      platform_type: "ios" | "android" | "web"
      rating_source: "historical" | "peer_voted" | "host_set"
      reaction_target_type: "feed_item" | "message"
      report_status: "pending" | "reviewed" | "actioned" | "dismissed"
      report_target_type: "competition" | "profile" | "message" | "feed_item"
      result_type:
      | "time"
      | "distance"
      | "score"
      | "inverted_score"
      | "weight"
      | "compound"
      | "possession"
      strength_vote: "confirm" | "reject"
      tiebreaker_resolved_by:
      | "medal_count"
      | "event_nomination"
      | "raw_margin"
      | "host"
      tiebreaker_status:
      | "pending_nomination"
      | "nominated"
      | "in_progress"
      | "resolved"
      vote_type: "mvp" | "worst_performer"
      weight_tag:
      | "not_important"
      | "standard"
      | "important"
      | "very_important"
      | "custom"
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
      attempt_status: ["pending", "success", "fail", "withdrawn"],
      competition_event_status: [
        "pending",
        "active",
        "results_pending",
        "disputed",
        "confirmed",
        "cancelled",
      ],
      competition_status: ["setup", "open", "active", "complete", "archived"],
      dispute_status: ["open", "resolved", "dismissed"],
      member_role: ["competitor", "spectator", "cohost"],
      member_status: ["invited", "active", "withdrawn"],
      message_type: ["group_chat", "direct_message"],
      platform_type: ["ios", "android", "web"],
      rating_source: ["historical", "peer_voted", "host_set"],
      reaction_target_type: ["feed_item", "message"],
      report_status: ["pending", "reviewed", "actioned", "dismissed"],
      report_target_type: ["competition", "profile", "message", "feed_item"],
      result_type: [
        "time",
        "distance",
        "score",
        "inverted_score",
        "weight",
        "compound",
        "possession",
      ],
      strength_vote: ["confirm", "reject"],
      tiebreaker_resolved_by: [
        "medal_count",
        "event_nomination",
        "raw_margin",
        "host",
      ],
      tiebreaker_status: [
        "pending_nomination",
        "nominated",
        "in_progress",
        "resolved",
      ],
      vote_type: ["mvp", "worst_performer"],
      weight_tag: [
        "not_important",
        "standard",
        "important",
        "very_important",
        "custom",
      ],
    },
  },
} as const
