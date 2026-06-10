// Points scale values and lookup for the platform scoring system.

export const POINTS_SCALE: Record<number, number> = {
  1: 10,
  2: 6,
  3: 3,
  4: 1,
  5: 0.5,
};

export const PARTICIPATION_POINTS = 0.1;
export const DNF_POINTS = 0;

export function getPointsForPlace(place: number): number {
  if (place >= 1 && place <= 5) {
    return POINTS_SCALE[place] ?? PARTICIPATION_POINTS;
  }
  return PARTICIPATION_POINTS;
}
