export function formatPoints(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? `${rounded | 0}` : `${rounded}`;
}
