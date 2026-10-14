/*
 * This file defines the validate multiplier module.
 */

// Validates that a custom weight multiplier is within the allowed range.
import { CUSTOM_WEIGHT_MAX, CUSTOM_WEIGHT_MIN } from '@repo/constants';

// Handles validate custom multiplier.
export function validateCustomMultiplier(value: number): boolean {
  return value >= CUSTOM_WEIGHT_MIN && value <= CUSTOM_WEIGHT_MAX;
}
