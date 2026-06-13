import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

export function isCompetitionActive(status: string): boolean {
  return status === 'active';
}

export function isCompetitionEditable(status: string): boolean {
  return status === 'setup' || status === 'open';
}

export function canHostEdit(profile: ProfileRow, competition: CompetitionRow): boolean {
  return profile.id === competition.host_id || profile.id === competition.cohost_id;
}

export function getCompetitionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    setup: 'Setting up',
    open: 'Open',
    active: 'Active',
    complete: 'Complete',
    archived: 'Archived',
  };
  return labels[status] ?? status;
}
