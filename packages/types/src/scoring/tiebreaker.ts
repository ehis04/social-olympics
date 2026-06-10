// Tiebreaker and nomination types.

import type { TiebreakerResolvedBy, TiebreakerStatus } from '../database/enums';

export interface Tiebreaker {
  id: string;
  competition_id: string;
  profile_ids: string[];
  status: TiebreakerStatus;
  resolved_by: TiebreakerResolvedBy | null;
  winner_profile_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface TiebreakerNomination {
  id: string;
  tiebreaker_id: string;
  profile_id: string;
  nominated_event_id: string;
  submitted_at: string;
}

export interface TiebreakerResolution {
  tiebreaker_id: string;
  winner_profile_id: string;
  resolved_by: TiebreakerResolvedBy;
  resolved_at: string;
}
