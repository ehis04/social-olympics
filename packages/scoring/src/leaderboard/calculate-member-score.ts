// Calculates a competition member's total score using best-of-N selection.
import { calculateBestOf } from '../best-of/calculate-best-of';

export interface MemberEventResult {
  competitionEventId: string;
  eventId: string;
  pointsAwarded: number;
  participationPoints: number;
  bonusPoints: number;
  isDnf: boolean;
}

export function calculateMemberScore(results: MemberEventResult[], n: number): number {
  const withTotals = results.map((r) => ({
    eventId: r.competitionEventId,
    totalPoints: r.pointsAwarded + r.participationPoints + r.bonusPoints,
    isDnf: r.isDnf,
  }));

  const bestOf = calculateBestOf(withTotals, n);
  const total = bestOf.reduce((sum, r) => sum + r.totalPoints, 0);
  return Math.max(0, total);
}
