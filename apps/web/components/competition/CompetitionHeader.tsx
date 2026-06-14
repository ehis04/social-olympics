// Displays competition name, status, meta info, prize pot, and leave button
'use client';

import { useRouter } from 'next/navigation';
import { Users, Calendar, MapPin } from 'lucide-react';
import { STATUS_COLOURS } from '@repo/constants';
import PrizePoolDisplay from '@/components/competition/PrizePoolDisplay';
import { toast } from '@/lib/toast';
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
}

export default function CompetitionHeader({ competition, currentMember, memberCount }: Props) {
  const router = useRouter();
  const statusColour =
    STATUS_COLOURS[competition.status as keyof typeof STATUS_COLOURS] ??
    'bg-grey-100 text-grey-600';

  const isHost = !currentMember
    ? false
    : currentMember.profile_id === competition.host_id;
  const canLeave =
    currentMember &&
    !isHost &&
    competition.status !== 'complete' &&
    competition.status !== 'archived';

  async function handleLeave() {
    if (!currentMember) return;
    try {
      const res = await fetch(
        `/api/competitions/${competition.id}/members/${currentMember.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? 'Failed to leave competition');
        return;
      }
      toast.success('You have left the competition');
      router.replace(ROUTES.DASHBOARD);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-grey-800 leading-tight">{competition.name}</h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColour}`}
            >
              {competition.status}
            </span>
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

        {canLeave && (
          <button
            onClick={handleLeave}
            className="shrink-0 rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-600 hover:border-red-300 hover:text-red-600 transition-colors"
          >
            Leave
          </button>
        )}
      </div>

      {competition.prize_pot_per_person != null && (
        <div className="mt-4 border-t border-grey-100 pt-4">
          <PrizePoolDisplay
            prizePerPerson={competition.prize_pot_per_person}
            memberCount={memberCount}
          />
        </div>
      )}
    </div>
  );
}
