/*
 * This file defines the count eligible module.
 */

// Counts results that are not DNF and therefore eligible for best-of selection.
interface EventResult {
  isDnf: boolean;
}

// Handles count eligible results.
export function countEligibleResults(results: EventResult[]): number {
  return results.filter((r) => !r.isDnf).length;
}
