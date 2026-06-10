// User profile and career statistics types.

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
  city: string | null;
  bio: string | null;
  favourite_sport: string | null;
  is_ghost: boolean;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type GhostProfile = Profile & { is_ghost: true };

export interface CareerStats {
  profile_id: string;
  competitions_entered: number;
  competitions_won: number;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  events_completed: number;
  mvp_awards: number;
  personal_bests: Record<string, number>;
  updated_at: string;
}

export type ProfileWithStats = Profile & { careerStats: CareerStats };

export interface ProfileSummary {
  id: string;
  display_name: string;
  avatar_url: string | null;
  country_code: string | null;
}
