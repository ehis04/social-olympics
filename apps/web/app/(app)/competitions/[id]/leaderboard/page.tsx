/*
 * This file renders the leaderboard application page.
 */

// Leaderboard page — server component for competition standings and tiebreakers
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getLeaderboard, getCompetition } from '@repo/supabase';
import { LeaderboardView } from '@/components/leaderboard/LeaderboardView';
import { getTiebreakerInfos } from '@/lib/tiebreakers/state';
import { rankStandings } from '@repo/scoring';
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
  params: Promise<{ id: string }>;
}

// Renders the leaderboard page component.
export default async function LeaderboardPage({ params }: Props) {
  const { id } = await params;
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect('/login' as Route);

  const [{ data: compData }, { data: leaderboardData }, { data: eventRows }, tiebreakers] = await Promise.all([
    getCompetition(client, id),
    getLeaderboard(client, id),
    client.from('competition_events').select('id, status').eq('competition_id', id),
    getTiebreakerInfos(client, id, user.id),
  ]);

  if (!compData) redirect('/dashboard' as Route);
  const competition = compData as CompetitionRow;

  // Competitors appear on the board; people who left keep their place if they already scored.
  const members = ((leaderboardData ?? []) as LeaderboardMember[]).filter((member) =>
    member.role === 'competitor' &&
    (member.status === 'active' || (member.status === 'withdrawn' && (member.events_completed ?? 0) > 0)),
  );

  const initialEntries = rankStandings(
    members.map((member) => ({
      profile_id: member.profile_id,
      total_points: Number(member.total_points ?? 0),
      gold_count: member.gold_count ?? 0,
      silver_count: member.silver_count ?? 0,
      bronze_count: member.bronze_count ?? 0,
      events_completed: member.events_completed ?? 0,
      ...(member.profiles ? { profiles: member.profiles } : {}),
    })),
  );

  const eventsRemaining = (eventRows ?? []).filter((event) => !['confirmed', 'cancelled'].includes(event.status)).length;

  return (
    <LeaderboardView
      competition={competition}
      initialEntries={initialEntries}
      tiebreakers={tiebreakers}
      eventsRemaining={eventsRemaining}
    />
  );
}
