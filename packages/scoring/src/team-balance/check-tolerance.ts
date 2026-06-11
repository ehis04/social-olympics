// Checks whether team strengths are within the allowed balance tolerance.
import { TEAM_BALANCE_TOLERANCE } from '@repo/constants';

export interface ToleranceResult {
  withinTolerance: boolean;
  maxDifferential: number;
  disclaimer?: string;
}

export function checkBalanceTolerance(teamStrengths: number[]): ToleranceResult {
  if (teamStrengths.length <= 1) {
    return { withinTolerance: true, maxDifferential: 0 };
  }

  const max = Math.max(...teamStrengths);
  const min = Math.min(...teamStrengths);
  const maxDifferential = max - min;
  const withinTolerance = maxDifferential <= TEAM_BALANCE_TOLERANCE;

  return {
    withinTolerance,
    maxDifferential,
    ...(withinTolerance
      ? {}
      : {
          disclaimer: `Teams are not perfectly balanced. The strength differential between the strongest and weakest team is ${maxDifferential.toFixed(1)} points (tolerance: ${TEAM_BALANCE_TOLERANCE}).`,
        }),
  };
}
