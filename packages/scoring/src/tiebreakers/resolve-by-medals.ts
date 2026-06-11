// Resolves a tiebreaker by comparing medal counts in gold → silver → bronze order.
export interface TiebreakerCandidate {
  profileId: string;
  gold: number;
  silver: number;
  bronze: number;
}

export function resolveByMedals(
  a: TiebreakerCandidate,
  b: TiebreakerCandidate,
): string | null {
  if (a.gold !== b.gold) return a.gold > b.gold ? a.profileId : b.profileId;
  if (a.silver !== b.silver) return a.silver > b.silver ? a.profileId : b.profileId;
  if (a.bronze !== b.bronze) return a.bronze > b.bronze ? a.profileId : b.profileId;
  return null;
}
