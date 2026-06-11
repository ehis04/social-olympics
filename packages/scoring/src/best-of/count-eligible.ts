// Counts results that are not DNF and therefore eligible for best-of selection.
interface EventResult {
  isDnf: boolean;
}

export function countEligibleResults(results: EventResult[]): number {
  return results.filter((r) => !r.isDnf).length;
}
