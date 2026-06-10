// Competition and event status constants, labels, colours, and valid transitions.

export const COMPETITION_STATUSES = ['setup', 'open', 'active', 'complete', 'archived'] as const;
export const COMPETITION_EVENT_STATUSES = [
  'pending', 'active', 'results_pending', 'disputed', 'confirmed', 'cancelled',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  setup: 'Setup',
  open: 'Open',
  active: 'Active',
  complete: 'Complete',
  archived: 'Archived',
  pending: 'Pending',
  results_pending: 'Results Pending',
  disputed: 'Disputed',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

export const STATUS_COLOURS: Record<string, string> = {
  setup: '#9BA4B4',
  open: '#3B82F6',
  active: '#2D6A4F',
  complete: '#C9A84C',
  archived: '#6B7280',
  pending: '#9BA4B4',
  results_pending: '#F59E0B',
  disputed: '#EF4444',
  confirmed: '#2D6A4F',
  cancelled: '#6B7280',
};

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  setup: ['open'],
  open: ['active', 'archived'],
  active: ['complete'],
  complete: ['archived'],
  archived: [],
};

export const VALID_EVENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['active', 'cancelled'],
  active: ['results_pending', 'cancelled'],
  results_pending: ['disputed', 'confirmed'],
  disputed: ['confirmed'],
  confirmed: [],
  cancelled: [],
};
