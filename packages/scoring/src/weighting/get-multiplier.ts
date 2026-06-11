// Returns the numeric weight multiplier for a given weight tag.
import { CUSTOM_WEIGHT_MAX, CUSTOM_WEIGHT_MIN, WEIGHT_TAG_MULTIPLIERS } from '@repo/constants';
import type { WeightTag } from '@repo/types';

export function getWeightMultiplier(weightTag: WeightTag, customMultiplier?: number): number {
  if (weightTag === 'custom') {
    if (customMultiplier === undefined) {
      throw new Error('customMultiplier is required when weightTag is "custom"');
    }
    if (customMultiplier < CUSTOM_WEIGHT_MIN || customMultiplier > CUSTOM_WEIGHT_MAX) {
      throw new RangeError(
        `customMultiplier must be between ${CUSTOM_WEIGHT_MIN} and ${CUSTOM_WEIGHT_MAX}, got ${customMultiplier}`,
      );
    }
    return customMultiplier;
  }
  const multiplier = WEIGHT_TAG_MULTIPLIERS[weightTag];
  if (multiplier === undefined) {
    throw new Error(`Unknown weight tag: ${weightTag}`);
  }
  return multiplier;
}
