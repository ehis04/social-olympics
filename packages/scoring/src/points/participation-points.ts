// Returns participation points based on DNF status.
import { PARTICIPATION_POINTS } from '@repo/constants';

export function getParticipationPoints(isDnf: boolean): number {
  return isDnf ? 0 : PARTICIPATION_POINTS;
}
