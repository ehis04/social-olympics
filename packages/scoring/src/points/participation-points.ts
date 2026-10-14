/*
 * This file defines the participation points module.
 */

// Returns participation points based on DNF status.
import { PARTICIPATION_POINTS } from '@repo/constants';

// Handles get participation points.
export function getParticipationPoints(isDnf: boolean): number {
  return isDnf ? 0 : PARTICIPATION_POINTS;
}
