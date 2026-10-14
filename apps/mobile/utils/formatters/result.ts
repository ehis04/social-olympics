/*
 * This file defines the result module.
 */

// Result value formatting — renders stored DB values as human-readable strings, matching the web app.
import { formatResultValue as formatStoredResult } from '@repo/scoring';

// Handles format result value.
export function formatResultValue(value: number | null | undefined, resultType: string): string {
  if (value === null || value === undefined) return '-';
  return formatStoredResult(value, resultType);
}

// Handles format place.
export function formatPlace(place: number | null | undefined): string {
  if (place === null || place === undefined) return '-';
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = place <= 3 ? (suffixes[place] ?? 'th') : 'th';
  return `${place}${suffix}`;
}
