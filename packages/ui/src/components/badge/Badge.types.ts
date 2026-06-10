import type { CompetitionEventStatus, CompetitionStatus } from '@repo/types';

export interface BadgeProps {
  status: CompetitionStatus | CompetitionEventStatus | string;
  label?: string;
  size?: 'sm' | 'md';
}
