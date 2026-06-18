// Competition helper utilities — role checks and status helpers.
import type { Database } from '@repo/types';

type MemberRole = Database['public']['Enums']['member_role'];
type CompetitionStatus = Database['public']['Enums']['competition_status'];

export function isHost(role: MemberRole | null | undefined): boolean {
  return role === 'cohost';
}

export function isHostOrCohost(role: MemberRole | null | undefined): boolean {
  return role === 'cohost';
}

export function canSubmitResults(role: MemberRole | null | undefined): boolean {
  return role === 'cohost' || role === 'competitor';
}

export function canVote(role: MemberRole | null | undefined): boolean {
  return role !== null && role !== undefined;
}

export function isCompetitionActive(status: CompetitionStatus | null | undefined): boolean {
  return status === 'active' || status === 'open';
}

export function isCompetitionComplete(status: CompetitionStatus | null | undefined): boolean {
  return status === 'complete';
}

export function formatMemberRole(role: MemberRole): string {
  const labels: Record<MemberRole, string> = {
    cohost: 'Co-host',
    competitor: 'Competitor',
    spectator: 'Spectator',
  };
  return labels[role] ?? role;
}
