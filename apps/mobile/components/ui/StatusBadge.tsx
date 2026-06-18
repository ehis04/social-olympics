// Status badge — maps competition/event status to colour tokens.
import { View, Text } from 'react-native';
import type { Database } from '@repo/types';

type CompetitionStatus = Database['public']['Enums']['competition_status'];
type EventStatus = Database['public']['Enums']['competition_event_status'];

interface Props {
  status: CompetitionStatus | EventStatus;
}

const STATUS_BG: Record<string, string> = {
  setup: 'bg-neutral-100',
  open: 'bg-blue-100',
  active: 'bg-primary-muted',
  complete: 'bg-gold-light',
  archived: 'bg-neutral-100',
  pending: 'bg-neutral-100',
  results_pending: 'bg-yellow-100',
  disputed: 'bg-red-100',
  confirmed: 'bg-primary-muted',
  cancelled: 'bg-neutral-100',
};

const STATUS_TEXT: Record<string, string> = {
  setup: 'text-neutral-500',
  open: 'text-info',
  active: 'text-primary',
  complete: 'text-yellow-700',
  archived: 'text-neutral-500',
  pending: 'text-neutral-500',
  results_pending: 'text-warning',
  disputed: 'text-error',
  confirmed: 'text-primary',
  cancelled: 'text-neutral-500',
};

export function StatusBadge({ status }: Props) {
  const bg = STATUS_BG[status] ?? 'bg-neutral-100';
  const text = STATUS_TEXT[status] ?? 'text-neutral-500';
  return (
    <View className={`rounded-full px-2 py-0.5 ${bg}`}>
      <Text className={`text-xs font-semibold capitalize ${text}`}>{status}</Text>
    </View>
  );
}
