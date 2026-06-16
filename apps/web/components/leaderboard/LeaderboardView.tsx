// LeaderboardView — live leaderboard with realtime updates and team toggle
'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@repo/supabase';
import { subscribeLeaderboard } from '@repo/supabase';
import { rankEntries } from '@repo/scoring';
import { LeaderboardTable } from './LeaderboardTable';
import { TeamLeaderboard } from './TeamLeaderboard';
import { TiebreakerBanner } from './TiebreakerBanner';
import { useTeamLeaderboard } from '@/hooks/leaderboard/useLeaderboard';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from '@/lib/toast';
import type { RankedMember } from '@/hooks/leaderboard/useLeaderboard';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type LeaderboardUpdate = Partial<RankedMember> & Pick<RankedMember, 'profile_id'>;

interface Props {
  competition: CompetitionRow;
  initialEntries: RankedMember[];
}

type Tab = 'individual' | 'team';

export function LeaderboardView({ competition, initialEntries }: Props) {
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
            ? { ...m, ...updatedMember }
            : m,
        );
        const ranked = rankEntries(
          merged.map((m) => ({
            profileId: m.profile_id,
            totalPoints: m.total_points ?? 0,
            gold: m.gold_count ?? 0,
            silver: m.silver_count ?? 0,
            bronze: m.bronze_count ?? 0,
          })),
        );
        return ranked.map((r) => {
          const member = merged.find((m) => m.profile_id === r.profileId);
          return { ...member!, rank: r.rank, isTied: r.isTied };
        });
      });
    });
    return () => unsubscribe();
  }, [competition.id]);

  const tiedGroups = groupTied(entries);
  const isHost = user?.id === competition.host_id;

  async function handleInitiateTiebreaker(profileIdA: string, profileIdB: string) {
    try {
      const res = await fetch(`/api/competitions/${competition.id}/tiebreakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id_a: profileIdA, profile_id_b: profileIdB }),
      });
      if (!res.ok) throw new Error('Failed to initiate tiebreaker');
      toast.success('Tiebreaker initiated');
    } catch {
      toast.error('Failed to initiate tiebreaker');
    }
  }

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
                ? 'bg-primary-600 text-white'
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
                ? 'bg-primary-600 text-white'
                : 'text-grey-600 hover:text-grey-900',
            ].join(' ')}
          >
            Team
          </button>
        </div>
      </div>

      {tab === 'individual' && (
        <>
          {tiedGroups.map((group, i) => (
            <TiebreakerBanner
              key={i}
              tiedEntries={group}
              currentUserId={user?.id ?? ''}
              isHost={isHost}
              competitionId={competition.id}
              onInitiate={handleInitiateTiebreaker}
            />
          ))}
          <LeaderboardTable entries={entries} currentUserId={user?.id ?? ''} />
        </>
      )}

      {tab === 'team' && (
        <TeamLeaderboard teams={(teamData as Parameters<typeof TeamLeaderboard>[0]['teams']) ?? []} />
      )}
    </div>
  );
}

function groupTied(entries: RankedMember[]): RankedMember[][] {
  const rankMap = new Map<number, RankedMember[]>();
  for (const entry of entries) {
    if (!entry.isTied) continue;
    const existing = rankMap.get(entry.rank) ?? [];
    existing.push(entry);
    rankMap.set(entry.rank, existing);
  }
  return Array.from(rankMap.values()).filter((g) => g.length >= 2);
}

function isLeaderboardUpdate(member: unknown): member is LeaderboardUpdate {
  return (
    typeof member === 'object' &&
    member !== null &&
    'profile_id' in member &&
    typeof member.profile_id === 'string'
  );
}
