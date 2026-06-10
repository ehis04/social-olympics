// Leaderboard entry types for individual and team standings.

import type { ProfileSummary } from '../users/profile';

export interface LeaderboardEntry {
  profile: ProfileSummary;
  total_points: number;
  rank: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  events_completed: number;
  is_tied: boolean;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  members: ProfileSummary[];
  total_points: number;
  events_won: number;
}
