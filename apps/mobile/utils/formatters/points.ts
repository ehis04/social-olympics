// Points value formatting utilities.
export function formatPoints(points: number | null | undefined): string {
  if (points === null || points === undefined) return '0 pts';
  if (Number.isInteger(points)) return `${points} pts`;
  return `${points.toFixed(1)} pts`;
}

export function formatPointsDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  if (Number.isInteger(delta)) return `${sign}${delta}`;
  return `${sign}${delta.toFixed(1)}`;
}
