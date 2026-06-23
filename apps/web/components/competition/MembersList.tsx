'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Medal, Shield, Eye, User, X, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InvitePanel from '@/components/competition/InvitePanel';
import GhostProfileForm from '@/components/competition/GhostProfileForm';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type MemberRole = Database['public']['Enums']['member_role'];
type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'display_name' | 'avatar_url' | 'country_code' | 'is_ghost'> | null;
};

interface EventEntry {
  id: string;
  finishing_place: number | null;
  points_awarded: number | null;
  participation_points: number | null;
  result_value_primary: number | null;
  is_dnf: boolean;
  competition_events: {
    id: string;
    status: string;
    scheduled_at: string | null;
    events: { name: string; result_type: string; event_categories: { name: string } | null } | null;
  } | null;
}

interface AssignedEntry {
  competition_event_id: string;
  competition_events: {
    id: string;
    status: string;
    scheduled_at: string | null;
    events: { name: string; result_type: string; event_categories: { name: string } | null } | null;
  } | null;
}

interface MemberEventData {
  assigned: AssignedEntry[];
  results: EventEntry[];
}

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

function placeLabel(place: number | null): string {
  if (!place) return '—';
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

function formatResult(value: number | null, resultType: string | undefined): string | null {
  if (value === null) return null;
  if (resultType === 'time') {
    const total = Math.round(value);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }
  return String(value);
}

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
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null);
  const [memberEvents, setMemberEvents] = useState<MemberEventData | null>(null);
  const [memberEventsLoading, setMemberEventsLoading] = useState(false);
  const canManage = isHost || isCohost;

  async function openMemberDrawer(member: MemberWithProfile) {
    setSelectedMember(member);
    setMemberEvents(null);
    setMemberEventsLoading(true);
    const profileId = member.profile_id;
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/members/${profileId}/events`,
      );
      if (res.ok) {
        const json = await res.json();
        // Discard if user switched to a different member while this fetch was in flight
        setSelectedMember((current) => {
          if (current?.profile_id === profileId) {
            setMemberEvents(json.data as MemberEventData);
          }
          return current;
        });
      }
    } catch {
      // drawer still opens, just no events shown
    } finally {
      setMemberEventsLoading(false);
    }
  }

  function closeMemberDrawer() {
    setSelectedMember(null);
    setMemberEvents(null);
  }

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

  // Assigned events that have not been competed in yet (pending/active)
  const upcomingAssigned = (memberEvents?.assigned ?? []).filter((a) => {
    const status = a.competition_events?.status;
    return status === 'pending' || status === 'active';
  });

  const completedResults = memberEvents?.results ?? [];

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
              const displayName = member.profile?.display_name ?? 'Unknown';
              const avatarUrl = member.profile?.avatar_url ?? null;
              const role = member.role as MemberRole;
              const isGhost = member.profile?.is_ghost ?? false;

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => openMemberDrawer(member)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-grey-50"
                  >
                    {/* Avatar */}
                    <div className="shrink-0">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-muted text-sm font-bold text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name + role */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-grey-800">
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
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-grey-500">
                        {ROLE_ICONS[role]}
                        <span>{ROLE_LABELS[role] ?? role}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex shrink-0 items-center gap-3 text-xs text-grey-500">
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
                      <ChevronRight size={14} className="text-grey-300" />
                    </div>
                  </button>

                  {/* Host management controls (separate row so they don't trigger the drawer) */}
                  {canManage && !isCurrentUser && (
                    <div className="flex items-center gap-2 border-t border-grey-50 px-4 py-2">
                      <select
                        value={role}
                        onChange={(e) => handleRoleChange(member, e.target.value as MemberRole)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-grey-200 px-2 py-1 text-xs text-grey-700 focus:border-primary focus:outline-none"
                      >
                        <option value="competitor">Competitor</option>
                        <option value="spectator">Spectator</option>
                        <option value="cohost">Co-host</option>
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmRemove(member); }}
                        className="rounded border border-grey-200 px-2 py-1 text-xs text-grey-600 transition-colors hover:border-red-300 hover:text-red-600"
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
            className="w-full rounded-lg border border-dashed border-grey-300 py-2.5 text-sm font-semibold text-grey-600 transition-colors hover:border-primary hover:text-primary"
          >
            + Create guest profile
          </button>
        </div>
      )}

      {/* Member event drawer / slide-over */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closeMemberDrawer}
          />

          {/* Panel */}
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-grey-100 px-5 py-4">
              {selectedMember.profile?.avatar_url ? (
                <Image
                  src={selectedMember.profile.avatar_url}
                  alt={selectedMember.profile?.display_name ?? ''}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-muted text-sm font-bold text-primary">
                  {(selectedMember.profile?.display_name ?? 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-grey-900">
                  {selectedMember.profile?.display_name ?? 'Unknown'}
                </p>
                <p className="text-xs text-grey-500 capitalize">
                  {ROLE_LABELS[selectedMember.role] ?? selectedMember.role}
                  {selectedMember.profile?.is_ghost ? ' · Guest' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMemberDrawer}
                className="rounded-full p-1.5 text-grey-400 hover:bg-grey-100 hover:text-grey-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex divide-x divide-grey-100 border-b border-grey-100">
              {[
                { label: 'Points', value: selectedMember.total_points ?? 0 },
                { label: 'Gold', value: selectedMember.gold_count ?? 0 },
                { label: 'Silver', value: selectedMember.silver_count ?? 0 },
                { label: 'Bronze', value: selectedMember.bronze_count ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 py-3 text-center">
                  <p className="text-base font-bold text-grey-900">{value}</p>
                  <p className="text-xs text-grey-500">{label}</p>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {memberEventsLoading ? (
                <div className="py-10 text-center text-sm text-grey-400">Loading events…</div>
              ) : (
                <div className="space-y-6">
                  {/* Upcoming / assigned */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-grey-400">
                      <Clock size={12} />
                      Upcoming
                    </div>
                    {upcomingAssigned.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-grey-200 p-4 text-center text-sm text-grey-400">
                        Not assigned to any upcoming events.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {upcomingAssigned.map((a) => {
                          const ev = a.competition_events;
                          const eventLib = ev?.events;
                          return (
                            <div key={a.competition_event_id} className="flex items-center gap-3 rounded-lg border border-grey-100 bg-grey-50 px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-sm font-semibold text-grey-800">
                                  {eventLib?.name ?? 'Event'}
                                </p>
                                {eventLib?.event_categories?.name && (
                                  <p className="text-xs capitalize text-grey-500">{eventLib.event_categories.name}</p>
                                )}
                              </div>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                                ev?.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-grey-100 text-grey-500'
                              }`}>
                                {ev?.status ?? 'pending'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-grey-400">
                      <CheckCircle size={12} />
                      Results
                    </div>
                    {completedResults.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-grey-200 p-4 text-center text-sm text-grey-400">
                        No results recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {completedResults.map((r) => {
                          const ev = r.competition_events;
                          const eventLib = ev?.events;
                          const totalPts = (r.points_awarded ?? 0) + (r.participation_points ?? 0);
                          const resultDisplay = formatResult(r.result_value_primary, eventLib?.result_type);
                          return (
                            <div key={r.id} className="rounded-lg border border-grey-100 bg-grey-50 px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-sm font-semibold text-grey-800">
                                    {eventLib?.name ?? 'Event'}
                                  </p>
                                  {eventLib?.event_categories?.name && (
                                    <p className="text-xs capitalize text-grey-500">{eventLib.event_categories.name}</p>
                                  )}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-grey-900">
                                    {r.is_dnf ? 'DNF' : placeLabel(r.finishing_place)}
                                  </p>
                                  <p className="text-xs text-grey-500">{totalPts.toFixed(1)} pts</p>
                                </div>
                              </div>
                              {resultDisplay && !r.is_dnf && (
                                <p className="mt-1 text-xs text-grey-400">
                                  Result: <span className="font-medium text-grey-600">{resultDisplay}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
