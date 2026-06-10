// Competition entity and payload types.

import type { CompetitionStatus } from '../database/enums';
import type { ProfileSummary } from '../users/profile';

export interface Competition {
  id: string;
  name: string;
  description: string | null;
  status: CompetitionStatus;
  is_public: boolean;
  host_id: string;
  cohost_id: string | null;
  country_code: string | null;
  city: string | null;
  invite_code: string;
  min_events_required: number;
  total_events: number;
  mvp_voting_enabled: boolean;
  worst_performer_enabled: boolean;
  prize_pot_per_person: number | null;
  weighting_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitionSummary {
  id: string;
  name: string;
  status: CompetitionStatus;
  is_public: boolean;
  country_code: string | null;
  city: string | null;
  host_id: string;
  member_count: number;
  event_count: number;
}

export type CompetitionWithDetails = Competition & {
  host: ProfileSummary;
  cohost?: ProfileSummary;
  memberCount: number;
};

export interface CreateCompetitionPayload {
  name: string;
  description?: string;
  is_public: boolean;
  country_code?: string;
  city?: string;
  min_events_required: number;
  total_events: number;
  mvp_voting_enabled: boolean;
  worst_performer_enabled: boolean;
  prize_pot_per_person?: number;
}

export type UpdateCompetitionPayload = Partial<CreateCompetitionPayload> & {
  status?: CompetitionStatus;
};
