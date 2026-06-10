// Team, team membership, and strength rating types.

import type { RatingSource } from '../database/enums';
import type { MemberWithProfile } from '../competition/member';

export interface Team {
  id: string;
  competition_event_id: string;
  name: string;
  colour: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  assigned_at: string;
}

export interface StrengthRatingVote {
  id: string;
  competition_id: string;
  voter_profile_id: string;
  subject_profile_id: string;
  event_id: string;
  rating: number;
  vote: string;
  created_at: string;
}

export type MemberWithRating = MemberWithProfile & {
  strength_rating: number;
  rating_source: RatingSource;
};

export interface BalancedTeams {
  teams: Team[];
  within_tolerance: boolean;
  max_differential: number;
  disclaimer?: string;
}
