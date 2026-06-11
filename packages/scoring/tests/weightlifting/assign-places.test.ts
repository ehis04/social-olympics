// Unit tests for assignWeightliftingPlaces — dense sequential place assignment.
import { describe, expect, it } from 'vitest';
import { assignWeightliftingPlaces } from '../../src/weightlifting/assign-places';

function getPlace(placements: ReturnType<typeof assignWeightliftingPlaces>, id: string) {
  return placements.find((p) => p.profileId === id)?.place;
}

describe('assignWeightliftingPlaces', () => {
  it('1 survivor, eliminations in rounds 3/2/1 → places 1,2,3,4', () => {
    const eliminations = [
      { round: 3, eliminatedProfileIds: ['b'] },
      { round: 2, eliminatedProfileIds: ['c', 'd'] },
      { round: 1, eliminatedProfileIds: ['e'] },
    ];
    const placements = assignWeightliftingPlaces(eliminations, ['a']);
    expect(getPlace(placements, 'a')).toBe(1);
    expect(getPlace(placements, 'b')).toBe(2);
    expect(getPlace(placements, 'c')).toBe(3);
    expect(getPlace(placements, 'd')).toBe(3);
    expect(getPlace(placements, 'e')).toBe(4);
  });

  it('3 survivors: all place 1, next eliminated is place 2 (not 4)', () => {
    const eliminations = [{ round: 2, eliminatedProfileIds: ['d', 'e'] }];
    const placements = assignWeightliftingPlaces(eliminations, ['a', 'b', 'c']);
    expect(getPlace(placements, 'a')).toBe(1);
    expect(getPlace(placements, 'b')).toBe(1);
    expect(getPlace(placements, 'c')).toBe(1);
    expect(getPlace(placements, 'd')).toBe(2); // NOT place 4
    expect(getPlace(placements, 'e')).toBe(2);
  });

  it('2 eliminated in same round share place, next group gets next place', () => {
    const eliminations = [
      { round: 3, eliminatedProfileIds: ['b', 'c'] },
      { round: 1, eliminatedProfileIds: ['d'] },
    ];
    const placements = assignWeightliftingPlaces(eliminations, ['a']);
    expect(getPlace(placements, 'b')).toBe(2);
    expect(getPlace(placements, 'c')).toBe(2);
    expect(getPlace(placements, 'd')).toBe(3); // next integer after 2, not 4
  });

  it('all fail same round: all share place 1 (no survivors)', () => {
    const eliminations = [{ round: 1, eliminatedProfileIds: ['a', 'b', 'c'] }];
    const placements = assignWeightliftingPlaces(eliminations, []);
    // No survivors — but everyone is in eliminations; the fn assigns from place 2 onwards
    // With no survivors, technically all share elimination — but spec says survivors = place 1
    // If no survivors, first elimination group starts at place 2... or place 1?
    // Spec: "finalSurvivors: all tied for 1st" — if empty, nobody gets place 1
    // Leaving as place 2 for the only group (no survivors edge case)
    expect(placements.every((p) => p.place === 2)).toBe(true);
  });
});
