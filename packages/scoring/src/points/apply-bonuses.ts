/*
 * This file defines the apply bonuses module.
 */

// Applies MVP bonus and worst performer penalty to a points total.
import { MVP_BONUS_POINTS, WORST_PERFORMER_PENALTY_POINTS } from '@repo/constants';

// Handles apply mvp bonus.
export function applyMvpBonus(currentPoints: number): number {
  return currentPoints + MVP_BONUS_POINTS;
}

// Handles apply worst performer penalty.
export function applyWorstPerformerPenalty(currentPoints: number): number {
  return currentPoints + WORST_PERFORMER_PENALTY_POINTS;
}
