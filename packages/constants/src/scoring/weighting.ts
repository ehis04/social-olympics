// Event weight multiplier constants and defaults.

export const WEIGHT_TAGS = {
  NOT_IMPORTANT: 0.5,
  STANDARD: 1.0,
  IMPORTANT: 1.5,
  VERY_IMPORTANT: 2.0,
} as const;

export const CUSTOM_WEIGHT_MIN = 0.1;
export const CUSTOM_WEIGHT_MAX = 3.0;
export const DEFAULT_WEIGHT_TAG = 'standard' as const;
export const DEFAULT_WEIGHT_MULTIPLIER = 1.0;

export const WEIGHT_TAG_MULTIPLIERS: Record<string, number> = {
  not_important: 0.5,
  standard: 1.0,
  important: 1.5,
  very_important: 2.0,
};
