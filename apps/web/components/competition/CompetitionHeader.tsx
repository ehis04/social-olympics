/*
 * This file defines the CompetitionHeader user-interface component.
 */

// Displays competition name, status, meta info, prize pot, and membership actions
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Users, Calendar, MapPin } from 'lucide-react';
import { STATUS_COLOURS } from '@repo/constants';
import PrizePoolDisplay from '@/components/competition/PrizePoolDisplay';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ReportButton } from '@/components/moderation/ReportButton';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

interface Props {
  competition: CompetitionRow;
  currentMember: MemberRow | null;
  memberCount: number;
  competitorCount: number;
}

// Renders the competition header component.
export default function CompetitionHeader({ competition, currentMember, memberCount, competitorCount }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isWorking, setIsWorking] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const statusColour = STATUS_COLOURS[competition.status] ?? '#6B7280';

  const isFinished = competition.status === 'complete' || competition.status === 'archived';
  const isActiveMember = currentMember?.status === 'active';
  const isInvited = currentMember?.status === 'invited';
  const isHost = currentMember?.profile_id === competition.host_id;
  const canLeave = isActiveMember && !isHost && !isFinished;
  const canJoin = !isFinished && !isActiveMember && !isInvited && competition.is_public;

  async function handleJoin() {
    setIsWorking(true);
    try {
      const res = await fetch(`/api/competitions/${competition.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await readJson(res);
      if (!res.ok) {
        toast.error(getApiErrorMessage(json, 'Failed to join competition'));
        return;
      }
      const joinedRole = (json as { data?: { role?: string } } | null)?.data?.role;
      toast.success(
        joinedRole === 'spectator'
          ? 'You joined as a spectator because the competition has already started. The host can make you a competitor.'
          : isInvited ? 'Invitation accepted' : 'You joined the competition',
      );
      void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLeave() {
    if (!currentMember) return;
    setIsWorking(true);
    try {
      const res = await fetch(
        `/api/competitions/${competition.id}/members/${currentMember.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to leave competition'));
        return;
      }
      toast.success('You have left the competition');
      void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsWorking(false);
      setConfirmLeave(false);
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-grey-800 leading-tight">{competition.name}</h1>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
              style={{ color: statusColour, backgroundColor: `${statusColour}1a` }}
            >
              {competition.status}
            </span>
            {(competition.season_number ?? 1) > 1 && (
              <span className="shrink-0 rounded-full bg-grey-100 px-2.5 py-0.5 text-xs font-semibold text-grey-600">
                Season {competition.season_number}
              </span>
            )}
            {!competition.is_public && (
              <span className="shrink-0 rounded-full bg-grey-100 px-2.5 py-0.5 text-xs font-semibold text-grey-600">
                Private
              </span>
            )}
          </div>

          {competition.description && (
            <p className="mb-3 text-sm text-grey-600">{competition.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-grey-500">
            <span className="flex items-center gap-1">
              <Users size={13} />
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            {competition.total_events != null && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {competition.total_events} {competition.total_events === 1 ? 'event' : 'events'}
              </span>
            )}
            {(competition.city || competition.country_code) && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {[competition.city, competition.country_code].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {(canJoin || isInvited) && (
            <button
              onClick={() => void handleJoin()}
              disabled={isWorking}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {isWorking
                ? 'Joining…'
                : isInvited
                  ? 'Accept invitation'
                  : competition.voting_locked ? 'Join as spectator' : 'Join competition'}
            </button>
          )}
          {canLeave && (
            <button
              onClick={() => setConfirmLeave(true)}
              disabled={isWorking}
              className="shrink-0 rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-60"
            >
              Leave
            </button>
          )}
          {!isHost && (
            <ReportButton targetType="competition" targetId={competition.id} competitionId={competition.id} label="Report" />
          )}
        </div>
      </div>

      {!isActiveMember && !isInvited && competition.is_public && !isFinished && (
        <p className="mt-3 rounded-md bg-grey-50 px-3 py-2 text-xs text-grey-600">
          You are viewing a public competition. Join to see the feed and chat, and to take part.
        </p>
      )}

      {competition.prize_pot_per_person != null && (
        <div className="mt-4 border-t border-grey-100 pt-4">
          <PrizePoolDisplay
            prizePerPerson={competition.prize_pot_per_person}
            memberCount={competitorCount}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmLeave}
        title="Leave competition?"
        message="You will lose access to this competition's chat and events. Your confirmed results stay on the leaderboard. You can rejoin later."
        confirmLabel="Leave"
        isDanger
        onConfirm={() => void handleLeave()}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  );
}
