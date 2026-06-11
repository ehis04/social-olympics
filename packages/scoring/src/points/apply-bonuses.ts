// Applies MVP bonus and worst performer penalty to a points total.
import { MVP_BONUS_POINTS, WORST_PERFORMER_PENALTY_POINTS } from '@repo/constants';

export function applyMvpBonus(currentPoints: number): number {
  return currentPoints + MVP_BONUS_POINTS;
}

export function applyWorstPerformerPenalty(currentPoints: number): number {
  return currentPoints + WORST_PERFORMER_PENALTY_POINTS;
}
