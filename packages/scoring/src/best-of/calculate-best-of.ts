// Selects the best N results from a set, excluding DNFs.
interface EventResult {
  eventId: string;
  totalPoints: number;
  isDnf: boolean;
}

export function calculateBestOf(results: EventResult[], n: number): EventResult[] {
  if (n <= 0) return [];
  const valid = results.filter((r) => !r.isDnf);
  const sorted = [...valid].sort((a, b) => b.totalPoints - a.totalPoints);
  return sorted.slice(0, n);
}
