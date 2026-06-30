// Result value formatting — renders stored DB values as human-readable strings.
import type { Database } from '@repo/types';

type ResultType = Database['public']['Enums']['result_type'];

export function formatResultValue(
  value: number | null | undefined,
  resultType: ResultType
): string {
  if (value === null || value === undefined) return '-';

  switch (resultType) {
    case 'time': {
      const totalMs = value;
      const minutes = Math.floor(totalMs / 60000);
      const seconds = Math.floor((totalMs % 60000) / 1000);
      const ms = totalMs % 1000;
      if (minutes > 0) {
        return `${minutes}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
      }
      return `${seconds}.${String(ms).padStart(3, '0')}s`;
    }
    case 'distance':
      return value >= 100 ? `${(value / 100).toFixed(2)}m` : `${value}cm`;
    case 'weight':
      return `${value}kg`;
    case 'compound':
      return `${value}kg×reps`;
    case 'score':
    case 'inverted_score':
      return String(value);
    case 'possession':
      return `${value} pts`;
    default:
      return String(value);
  }
}

export function formatPlace(place: number | null | undefined): string {
  if (place === null || place === undefined) return '-';
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = place <= 3 ? (suffixes[place] ?? 'th') : 'th';
  return `${place}${suffix}`;
}
