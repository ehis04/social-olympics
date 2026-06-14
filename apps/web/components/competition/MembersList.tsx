'use client';

// Members list with host management controls, role changes, invite panel, ghost profile form
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Medal, Shield, Eye, User } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InvitePanel from '@/components/competition/InvitePanel';
import GhostProfileForm from '@/components/competition/GhostProfileForm';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type MemberRole = Database['public']['Enums']['member_role'];
type MemberStatus = Database['public']['Enums']['member_status'];
type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

interface Props {
  members: MemberWithProfile[];
  competitionId: string;
  inviteCode: string;
  currentMemberId: string | null;
  isHost: boolean;
  isCohost: boolean;
  competitionStatus: string;
}

const ROLE_LABELS: Record<string, string> = {
  competitor: 'Competitor',
  spectator: 'Spectator',
  cohost: 'Co-host',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  competitor: <User size={12} />,
  spectator: <Eye size={12} />,
  cohost: <Shield size={12} />,
};

export default function MembersList({
  members,
  competitionId,
  inviteCode,
  currentMemberId,
  isHost,
  isCohost,
  competitionStatus,
}: Props) {
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState<MemberWithProfile | null>(null);
  const [showGhostForm, setShowGhostForm] = useState(false);
  const canManage = isHost || isCohost;

  async function handleRoleChange(member: MemberWithProfile, role: MemberRole) {
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/members/${member.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to update role');
        return;
      }
      toast.success('Role updated');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function handleRemove(member: MemberWithProfile) {
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/members/${member.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to remove member');
        return;
      }
      toast.success('Member removed');
      setConfirmRemove(null);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  const activeMembers = members.filter((m) => m.status !== 'withdrawn');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-grey-800">
          Members ({activeMembers.length})
        </h2>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border border-grey-200 bg-white">
        {activeMembers.length === 0 ? (
          <p className="p-6 text-center text-sm text-grey-500">No members yet.</p>
        ) : (
          <ul className="divide-y divide-grey-100">
            {activeMembers.map((member) => {
              const isCurrentUser = member.id === currentMemberId;
              const isThisHost = member.profile_id === member.profile?.id && isHost && isCurrentUser;
              const displayName = member.profile?.display_name ?? 'Unknown';
              const role = member.role as MemberRole;
              const isGhost = member.profile?.is_ghost ?? false;

              return (
                <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-grey-800 truncate">
                        {displayName}
                      </span>
                      {isGhost && (
                        <span className="rounded-full bg-grey-100 px-2 py-0.5 text-xs text-grey-500">
                          Guest
                        </span>
                      )}
                      {isCurrentUser && (
                        <span className="rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold text-primary">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-grey-500">
                      {ROLE_ICONS[role]}
                      <span>{ROLE_LABELS[role] ?? role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-grey-500 shrink-0">
                    <span className="flex items-center gap-1">
                      <Medal size={12} className="text-yellow-500" />
                      {member.gold_count ?? 0}
                      <Medal size={12} className="text-grey-400" />
                      {member.silver_count ?? 0}
                      <Medal size={12} className="text-amber-700" />
                      {member.bronze_count ?? 0}
                    </span>
                    <span className="font-semibold text-grey-700">
                      {member.total_points ?? 0} pts
                    </span>
                  </div>

                  {canManage && !isCurrentUser && (
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(member, e.target.value as MemberRole)}
                        className="rounded border border-grey-200 px-2 py-1 text-xs text-grey-700 focus:border-primary focus:outline-none"
                      >
                        <option value="competitor">Competitor</option>
                        <option value="spectator">Spectator</option>
                        <option value="cohost">Co-host</option>
                      </select>
                      <button
                        onClick={() => setConfirmRemove(member)}
                        className="rounded border border-grey-200 px-2 py-1 text-xs text-grey-600 hover:border-red-300 hover:text-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="space-y-4">
          <InvitePanel competitionId={competitionId} inviteCode={inviteCode} />
          <button
            onClick={() => setShowGhostForm(true)}
            className="w-full rounded-lg border border-dashed border-grey-300 py-2.5 text-sm font-semibold text-grey-600 hover:border-primary hover:text-primary transition-colors"
          >
            + Create guest profile
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmRemove}
        title="Remove member"
        message={`Remove ${confirmRemove?.profile?.display_name ?? 'this member'} from the competition? Their results will be kept but they will be marked as withdrawn.`}
        confirmLabel="Remove"
        isDanger
        onConfirm={() => confirmRemove && handleRemove(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />

      {showGhostForm && (
        <GhostProfileForm
          competitionId={competitionId}
          onClose={() => setShowGhostForm(false)}
          onSuccess={() => {
            setShowGhostForm(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
