// Leaderboard page — server component for competition leaderboard
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getLeaderboard, getCompetition } from '@repo/supabase';
import { rankEntries } from '@repo/scoring';
import { LeaderboardView } from '@/components/leaderboard/LeaderboardView';
import type { Database } from '@repo/types';
import type { Route } from 'next';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type CompetitionMemberRow = Database['public']['Tables']['competition_members']['Row'];
type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'display_name' | 'avatar_url' | 'country_code'
>;
type LeaderboardMember = CompetitionMemberRow & {
  profiles?: ProfileSummary | null;
};

interface Props {
  params: { id: string };
}

export default async function LeaderboardPage({ params }: Props) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login' as Route);

  const [{ data: compData }, { data: leaderboardData }] = await Promise.all([
    getCompetition(client, params.id),
    getLeaderboard(client, params.id),
  ]);

  if (!compData) redirect('/dashboard' as Route);
  const competition = compData as CompetitionRow;

  const members = (leaderboardData ?? []) as LeaderboardMember[];

  const ranked = rankEntries(
    members.map((m) => ({
      profileId: m.profile_id,
      totalPoints: m.total_points ?? 0,
      gold: m.gold_count ?? 0,
      silver: m.silver_count ?? 0,
      bronze: m.bronze_count ?? 0,
    })),
  );

  const initialEntries = ranked.map((r) => {
    const member = members.find((m) => m.profile_id === r.profileId)!;
    return {
      profile_id: member.profile_id,
      rank: r.rank,
      isTied: r.isTied,
      total_points: member.total_points ?? 0,
      gold_count: member.gold_count ?? 0,
      silver_count: member.silver_count ?? 0,
      bronze_count: member.bronze_count ?? 0,
      events_completed: member.events_completed ?? 0,
      ...(member.profiles ? { profiles: member.profiles } : {}),
    };
  });

  return <LeaderboardView competition={competition} initialEntries={initialEntries} />;
}
