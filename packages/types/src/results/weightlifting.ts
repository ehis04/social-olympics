// Weightlifting bid format types.

import type { AttemptStatus } from '../database/enums';

export interface WeightliftingBid {
  id: string;
  competition_event_id: string;
  profile_id: string;
  bid_round: number;
  bid_weight_kg: number;
  attempt_status: AttemptStatus;
  submitted_at: string;
}

export interface BidRound {
  round: number;
  bids: WeightliftingBid[];
}

export interface SubmitBidPayload {
  competition_event_id: string;
  bid_weight_kg: number;
  bid_round: number;
}

export interface ProcessBidRoundPayload {
  competition_event_id: string;
  round: number;
  results: Array<{ profile_id: string; attempt_status: AttemptStatus }>;
}
