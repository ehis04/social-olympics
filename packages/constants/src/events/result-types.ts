// Configuration metadata for each result type used across the event library.

export interface ResultTypeConfig {
  label: string;
  unit: string;
  lowerIsBetter: boolean;
  primaryFieldLabel: string;
  secondaryFieldLabel: string | null;
}

export const RESULT_TYPE_CONFIG: Record<string, ResultTypeConfig> = {
  time: {
    label: 'Time',
    unit: 's',
    lowerIsBetter: true,
    primaryFieldLabel: 'Time (ms)',
    secondaryFieldLabel: null,
  },
  distance: {
    label: 'Distance',
    unit: 'm',
    lowerIsBetter: false,
    primaryFieldLabel: 'Distance (cm)',
    secondaryFieldLabel: null,
  },
  score: {
    label: 'Score',
    unit: 'pts',
    lowerIsBetter: false,
    primaryFieldLabel: 'Score',
    secondaryFieldLabel: null,
  },
  inverted_score: {
    label: 'Score (lower wins)',
    unit: 'strokes',
    lowerIsBetter: true,
    primaryFieldLabel: 'Score',
    secondaryFieldLabel: null,
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    lowerIsBetter: false,
    primaryFieldLabel: 'Weight (kg)',
    secondaryFieldLabel: null,
  },
  compound: {
    label: 'Weight × Reps',
    unit: 'reps',
    lowerIsBetter: false,
    primaryFieldLabel: 'Weight (kg)',
    secondaryFieldLabel: 'Reps',
  },
  possession: {
    label: 'Possession Points',
    unit: 'pts',
    lowerIsBetter: false,
    primaryFieldLabel: 'Possessions Won',
    secondaryFieldLabel: null,
  },
};
