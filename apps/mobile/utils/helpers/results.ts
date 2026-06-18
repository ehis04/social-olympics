// Result input helpers — keyboard type and validation per result_type.
import type { Database } from '@repo/types';

type ResultType = Database['public']['Enums']['result_type'];

export function getKeyboardTypeForResultType(
  resultType: ResultType
): 'numeric' | 'decimal-pad' | 'default' {
  switch (resultType) {
    case 'time':
    case 'distance':
    case 'weight':
    case 'compound':
    case 'score':
    case 'inverted_score':
    case 'possession':
      return 'decimal-pad';
    default:
      return 'default';
  }
}

export function getResultInputPlaceholder(resultType: ResultType): string {
  switch (resultType) {
    case 'time':
      return 'Time in ms (e.g. 10580)';
    case 'distance':
      return 'Distance in cm (e.g. 850)';
    case 'weight':
      return 'Weight in kg (e.g. 100)';
    case 'compound':
      return 'Weight × reps value';
    case 'score':
      return 'Score (higher is better)';
    case 'inverted_score':
      return 'Score (lower is better)';
    case 'possession':
      return 'Possession points';
    default:
      return 'Enter result';
  }
}

export function getResultInputLabel(resultType: ResultType): string {
  switch (resultType) {
    case 'time':
      return 'Time (ms)';
    case 'distance':
      return 'Distance (cm)';
    case 'weight':
      return 'Weight (kg)';
    case 'compound':
      return 'Compound score';
    case 'score':
      return 'Score';
    case 'inverted_score':
      return 'Score';
    case 'possession':
      return 'Possession points';
    default:
      return 'Result';
  }
}
