// Processes a completed weightlifting bid round to determine eliminations and advances.
import type { AttemptStatus } from '@repo/types';

export interface BidAttempt {
  profileId: string;
  bidWeightKg: number;
  attemptStatus: AttemptStatus;
}

export interface BidRoundResult {
  eliminated: string[];
  advancing: string[];
  roundWeight: number;
}

export function processBidRound(bids: BidAttempt[]): BidRoundResult {
  const hasPending = bids.some((b) => b.attemptStatus === 'pending');
  if (hasPending) {
    throw new Error('Cannot process bid round: one or more bids are still pending');
  }

  const eliminated = bids.filter((b) => b.attemptStatus === 'fail').map((b) => b.profileId);
  const advancing = bids.filter((b) => b.attemptStatus === 'success').map((b) => b.profileId);
  const roundWeight = bids[0]?.bidWeightKg ?? 0;

  return { eliminated, advancing, roundWeight };
}
