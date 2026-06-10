// Event result types.

import type { ProfileSummary } from '../users/profile';
import type { Team } from '../scoring/team-balance';

export interface Result {
  id: string;
  competition_event_id: string;
  profile_id: string;
  team_id: string | null;
  result_value_primary: number | null;
  result_value_secondary: number | null;
  is_dnf: boolean;
  finishing_place: number | null;
  points_awarded: number | null;
  participation_points: number | null;
  evidence_url: string | null;
  notes: string | null;
  submitted_at: string;
  confirmed_at: string | null;
}

export type ResultWithProfile = Result & {
  profile: ProfileSummary;
  team?: Team;
};

export interface SubmitResultPayload {
  competition_event_id: string;
  profile_id: string;
  result_value_primary?: number;
  result_value_secondary?: number;
  is_dnf: boolean;
  evidence_url?: string;
  notes?: string;
}

export interface ConfirmResultPayload {
  result_id: string;
  finishing_place: number;
  points_awarded: number;
  participation_points: number;
}
