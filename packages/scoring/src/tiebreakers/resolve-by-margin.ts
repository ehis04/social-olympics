/*
 * This file defines the resolve by margin module.
 */

// Resolves a sealed-event tiebreaker by comparing head-to-head margins.
import { RESULT_TYPE_CONFIG } from '@repo/constants';

export interface NominationResult {
  profileId: string;
  nominatedEventId: string;
  resultValuePrimary: number;
  opponentResultValuePrimary: number;
  resultType: string;
}

// Handles is lower better.
function isLowerBetter(resultType: string): boolean {
  return RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]?.lowerIsBetter ?? false;
}

// Handles wins event.
function winsEvent(result: number, opponentResult: number, resultType: string): boolean {
  return isLowerBetter(resultType) ? result < opponentResult : result > opponentResult;
}

// Handles resolve by margin.
export function resolveByMargin(
  nominationA: NominationResult,
  nominationB: NominationResult,
): string | null {
  const aWinsEventA = winsEvent(
    nominationA.resultValuePrimary,
    nominationA.opponentResultValuePrimary,
    nominationA.resultType,
  );
  const bWinsEventB = winsEvent(
    nominationB.resultValuePrimary,
    nominationB.opponentResultValuePrimary,
    nominationB.resultType,
  );

  const bWinsEventA = winsEvent(
    nominationA.opponentResultValuePrimary,
    nominationA.resultValuePrimary,
    nominationA.resultType,
  );
  const aWinsEventB = winsEvent(
    nominationB.opponentResultValuePrimary,
    nominationB.resultValuePrimary,
    nominationB.resultType,
  );
  const aWins = Number(aWinsEventA) + Number(aWinsEventB);
  const bWins = Number(bWinsEventA) + Number(bWinsEventB);

  if (aWins > bWins) return nominationA.profileId;
  if (bWins > aWins) return nominationB.profileId;

  // Level on events won (1-1 or two draws): the bigger winning margin decides.
  const marginInA = Math.abs(nominationA.resultValuePrimary - nominationA.opponentResultValuePrimary);
  const marginInB = Math.abs(nominationB.resultValuePrimary - nominationB.opponentResultValuePrimary);
  const winnerOfA = aWinsEventA ? nominationA.profileId : bWinsEventA ? nominationB.profileId : null;
  const winnerOfB = bWinsEventB ? nominationB.profileId : aWinsEventB ? nominationA.profileId : null;

  if (winnerOfA && winnerOfB && winnerOfA !== winnerOfB) {
    if (marginInA > marginInB) return winnerOfA;
    if (marginInB > marginInA) return winnerOfB;
  }
  return null; // equal margins or drawn events — host decides
}
