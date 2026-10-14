/*
 * This file ranks competition standings the same way final places are decided.
 */

export interface StandingInput {
  profile_id: string;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
}

export type RankedStanding<T> = T & { rank: number; isTied: boolean };

// Handles same standing.
function sameStanding(a: StandingInput, b: StandingInput): boolean {
  return Number(a.total_points) === Number(b.total_points) &&
    a.gold_count === b.gold_count &&
    a.silver_count === b.silver_count &&
    a.bronze_count === b.bronze_count;
}

// Orders by points, then gold, silver and bronze medals. Competitors level on all of these
// share a dense rank; a tie is only flagged once points have been scored.
export function rankStandings<T extends StandingInput>(entries: T[]): RankedStanding<T>[] {
  const sorted = [...entries].sort((a, b) =>
    Number(b.total_points) - Number(a.total_points) ||
    b.gold_count - a.gold_count ||
    b.silver_count - a.silver_count ||
    b.bronze_count - a.bronze_count,
  );

  let rank = 0;
  return sorted.map((entry, index) => {
    const previous = sorted[index - 1];
    if (!previous || !sameStanding(previous, entry)) rank += 1;
    const tiedWithSomeone = sorted.some((other) => other !== entry && sameStanding(other, entry));
    return { ...entry, rank, isTied: tiedWithSomeone && Number(entry.total_points) > 0 };
  });
}

// Groups competitors who are level on points and medals.
export function groupTies<T extends StandingInput>(ranked: RankedStanding<T>[]): RankedStanding<T>[][] {
  const groups = new Map<number, RankedStanding<T>[]>();
  for (const entry of ranked) {
    if (!entry.isTied) continue;
    groups.set(entry.rank, [...(groups.get(entry.rank) ?? []), entry]);
  }
  return [...groups.values()].filter((group) => group.length >= 2);
}
