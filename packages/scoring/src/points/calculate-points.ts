// Calculates weighted points for a given finishing place.
import {
  CUSTOM_WEIGHT_MAX,
  CUSTOM_WEIGHT_MIN,
  PARTICIPATION_POINTS,
  POINTS_SCALE,
} from '@repo/constants';

function getPointsForPlace(place: number): number {
  const scaled = POINTS_SCALE[place as keyof typeof POINTS_SCALE];
  return scaled !== undefined ? scaled : PARTICIPATION_POINTS;
}

export function calculatePoints(place: number, weightMultiplier: number): number {
  if (weightMultiplier < CUSTOM_WEIGHT_MIN || weightMultiplier > CUSTOM_WEIGHT_MAX) {
    throw new RangeError(
      `weightMultiplier must be between ${CUSTOM_WEIGHT_MIN} and ${CUSTOM_WEIGHT_MAX}, got ${weightMultiplier}`,
    );
  }
  return getPointsForPlace(place) * weightMultiplier;
}
