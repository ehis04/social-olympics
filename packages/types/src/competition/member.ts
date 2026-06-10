// Competition membership types.

import type { MemberRole, MemberStatus } from '../database/enums';
import type { ProfileSummary } from '../users/profile';

export interface CompetitionMember {
  id: string;
  competition_id: string;
  profile_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string | null;
  invited_at: string;
}

export type MemberWithProfile = CompetitionMember & { profile: ProfileSummary };

export interface InviteByEmailPayload {
  competition_id: string;
  email: string;
  role: MemberRole;
}

export interface UpdateMemberRolePayload {
  member_id: string;
  role: MemberRole;
}
