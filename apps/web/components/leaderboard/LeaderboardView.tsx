/*
 * This file defines the LeaderboardView user-interface component.
 */

// LeaderboardView — live leaderboard with realtime updates, tiebreakers and team toggle
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@repo/supabase';
import { subscribeLeaderboard } from '@repo/supabase';
import { LeaderboardTable } from './LeaderboardTable';
import { TeamLeaderboard } from './TeamLeaderboard';
import { TiebreakerBanner } from './TiebreakerBanner';
import { useTeamLeaderboard } from '@/hooks/leaderboard/useLeaderboard';
import { useAuth } from '@/hooks/auth/useAuth';
import { groupTies, rankStandings } from '@repo/scoring';
import type { RankedMember } from '@/hooks/leaderboard/useLeaderboard';
import type { TiebreakerInfo } from '@/lib/tiebreakers/state';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type LeaderboardUpdate = Partial<RankedMember> & Pick<RankedMember, 'profile_id'>;

export type { TiebreakerInfo } from '@/lib/tiebreakers/state';

interface Props {
  competition: CompetitionRow;
  initialEntries: RankedMember[];
  tiebreakers?: TiebreakerInfo[];
  eventsRemaining?: number;
}

type Tab = 'individual' | 'team';

// Renders the leaderboard view component.
export function LeaderboardView({ competition, initialEntries, tiebreakers = [], eventsRemaining = 0 }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('individual');
  const [entries, setEntries] = useState<RankedMember[]>(initialEntries);

  const { data: teamData } = useTeamLeaderboard(competition.id);

  useEffect(() => {
    const client = createBrowserClient();
    const unsubscribe = subscribeLeaderboard(client, competition.id, (updatedMember) => {
      setEntries((prev) => {
        if (!isLeaderboardUpdate(updatedMember)) return prev;
        const merged = prev.map((m) =>
          m.profile_id === updatedMember.profile_id
            ? {
              ...m,
              ...updatedMember,
              total_points: Number(updatedMember.total_points ?? m.total_points),
            }
            : m,
        );
        return rankStandings(merged);
      });
    });
    return () => unsubscribe();
  }, [competition.id]);

  const isHost = user?.id === competition.host_id || user?.id === competition.cohost_id;
  const isFinished = competition.status === 'complete' || competition.status === 'archived';
  // Ties only matter for the podium places.
  const podiumTies = groupTies(entries).filter((group) => (group[0]?.rank ?? 99) <= 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-grey-900">Leaderboard</h2>
        <div className="flex rounded-lg border border-grey-200 p-0.5">
          <button
            onClick={() => setTab('individual')}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === 'individual'
                ? 'bg-primary text-white'
                : 'text-grey-600 hover:text-grey-900',
            ].join(' ')}
          >
            Individual
          </button>
          <button
            onClick={() => setTab('team')}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === 'team'
                ? 'bg-primary text-white'
                : 'text-grey-600 hover:text-grey-900',
            ].join(' ')}
          >
            Team
          </button>
        </div>
      </div>

      {tab === 'individual' && (
        <>
          {!isFinished && podiumTies.map((group) => (
            <TiebreakerBanner
              key={group.map((entry) => entry.profile_id).join('-')}
              tiedEntries={group}
              currentUserId={user?.id ?? ''}
              isHost={isHost}
              competitionId={competition.id}
              tiebreaker={tiebreakers.find((tb) => {
                const pair = [tb.profileIdA, tb.profileIdB];
                return group.length === 2 && group.every((entry) => pair.includes(entry.profile_id));
              }) ?? null}
              eventsRemaining={eventsRemaining}
            />
          ))}
          <p className="text-xs text-grey-500">
            Ranked by points, then gold, silver and bronze medals.
            {competition.min_events_required ? ` Each total counts the best ${competition.min_events_required} results.` : ''}
          </p>
          <LeaderboardTable entries={entries} currentUserId={user?.id ?? ''} />
        </>
      )}

      {tab === 'team' && (
        <TeamLeaderboard teams={(teamData as Parameters<typeof TeamLeaderboard>[0]['teams']) ?? []} />
      )}
    </div>
  );
}

// Handles is leaderboard update.
function isLeaderboardUpdate(member: unknown): member is LeaderboardUpdate {
  return (
    typeof member === 'object' &&
    member !== null &&
    'profile_id' in member &&
    typeof member.profile_id === 'string'
  );
}
