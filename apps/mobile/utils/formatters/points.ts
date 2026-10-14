/*
 * This file defines the points module.
 */

// Points rounded to one decimal place, without trailing zeros (12, 12.5).
export function formatPointsValue(points: number | null | undefined): string {
  const rounded = Math.round(Number(points ?? 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// Points value with its unit, for example "12.5 pts".
export function formatPoints(points: number | null | undefined): string {
  return `${formatPointsValue(points)} pts`;
}

// Handles format points delta.
export function formatPointsDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${formatPointsValue(delta)}`;
}
