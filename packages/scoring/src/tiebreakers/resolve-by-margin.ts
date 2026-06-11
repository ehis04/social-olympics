// Resolves a sealed-event tiebreaker by comparing head-to-head margins.
import { RESULT_TYPE_CONFIG } from '@repo/constants';

export interface NominationResult {
  profileId: string;
  nominatedEventId: string;
  resultValuePrimary: number;
  opponentResultValuePrimary: number;
  resultType: string;
}

function isLowerBetter(resultType: string): boolean {
  return RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]?.lowerIsBetter ?? false;
}

function winsEvent(result: number, opponentResult: number, resultType: string): boolean {
  return isLowerBetter(resultType) ? result < opponentResult : result > opponentResult;
}

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

  if (aWinsEventA && !bWinsEventB) return nominationA.profileId;
  if (!aWinsEventA && bWinsEventB) return nominationB.profileId;
  if (!aWinsEventA && !bWinsEventB) {
    // B won event A, A won event B — shouldn't happen in valid data but handle gracefully
    return null;
  }

  // 1-1: compare margins
  const marginA = Math.abs(nominationA.resultValuePrimary - nominationA.opponentResultValuePrimary);
  const marginB = Math.abs(nominationB.resultValuePrimary - nominationB.opponentResultValuePrimary);

  if (marginA > marginB) return nominationA.profileId;
  if (marginB > marginA) return nominationB.profileId;
  return null; // equal margins — host decides
}
