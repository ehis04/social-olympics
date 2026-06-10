// Result dispute types.

import type { DisputeStatus } from '../database/enums';

export interface ResultDispute {
  id: string;
  result_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolved_by: string | null;
  resolution_notes: string | null;
  raised_at: string;
  resolved_at: string | null;
}

export interface RaiseDisputePayload {
  result_id: string;
  reason: string;
}

export interface ResolveDisputePayload {
  dispute_id: string;
  action: 'resolve' | 'dismiss';
}
