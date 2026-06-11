// Assigns finishing places to weightlifting competitors using elimination order (dense ranking).
export interface EliminationEvent {
  round: number;
  eliminatedProfileIds: string[];
}

export interface WeightliftingPlacement {
  profileId: string;
  place: number;
}

export function assignWeightliftingPlaces(
  eliminations: EliminationEvent[],
  finalSurvivors: string[],
): WeightliftingPlacement[] {
  const results: WeightliftingPlacement[] = [];

  // Survivors all share place 1
  for (const profileId of finalSurvivors) {
    results.push({ profileId, place: 1 });
  }

  // Sort eliminations from last round (highest) to first (lowest)
  const sorted = [...eliminations].sort((a, b) => b.round - a.round);

  let nextPlace = 2; // place immediately after survivors

  for (const event of sorted) {
    for (const profileId of event.eliminatedProfileIds) {
      results.push({ profileId, place: nextPlace });
    }
    nextPlace++; // next group gets next sequential integer
  }

  return results;
}
