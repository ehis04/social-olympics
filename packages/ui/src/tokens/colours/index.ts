// Design system colour tokens — gold reserved exclusively for medals/achievements.

import type { CompetitionEventStatus, CompetitionStatus } from '@repo/types';

export const COLOURS = {
  primary: {
    DEFAULT: '#2D6A4F',
    dark: '#1B4332',
    light: '#B7E4C7',
    muted: '#F0FAF4',
  },
  gold: {
    DEFAULT: '#C9A84C',
    light: '#FDF3DC',
  },
  silver: '#9BA4B4',
  bronze: '#CD7F32',
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  success: '#10B981',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const STATUS_COLOURS: Record<CompetitionStatus | CompetitionEventStatus, string> = {
  setup: COLOURS.neutral[400],
  open: COLOURS.info,
  active: COLOURS.primary.DEFAULT,
  complete: COLOURS.gold.DEFAULT,
  archived: COLOURS.neutral[500],
  pending: COLOURS.neutral[400],
  results_pending: COLOURS.warning,
  disputed: COLOURS.error,
  confirmed: COLOURS.primary.DEFAULT,
  cancelled: COLOURS.neutral[500],
};

export const PLACE_COLOURS = {
  first: COLOURS.gold.DEFAULT,
  second: COLOURS.silver,
  third: COLOURS.bronze,
} as const;
