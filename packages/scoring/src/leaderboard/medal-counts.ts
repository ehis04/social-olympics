// Counts gold, silver, and bronze medals from a set of results.
export interface MedalCounts {
  gold: number;
  silver: number;
  bronze: number;
}

export function getMedalCounts(
  results: Array<{ finishingPlace: number | null }>,
): MedalCounts {
  return results.reduce<MedalCounts>(
    (counts, r) => {
      if (r.finishingPlace === 1) counts.gold++;
      else if (r.finishingPlace === 2) counts.silver++;
      else if (r.finishingPlace === 3) counts.bronze++;
      return counts;
    },
    { gold: 0, silver: 0, bronze: 0 },
  );
}
