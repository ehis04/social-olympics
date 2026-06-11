// Returns the numeric weight multiplier for a given weight tag.
import { CUSTOM_WEIGHT_MAX, CUSTOM_WEIGHT_MIN } from '@repo/constants';
import type { WeightTag } from '@repo/types';

const PRESET_MULTIPLIERS: Record<Exclude<WeightTag, 'custom'>, number> = {
  not_important: 0.5,
  standard: 1.0,
  important: 1.5,
  very_important: 2.0,
};

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
  return PRESET_MULTIPLIERS[weightTag];
}