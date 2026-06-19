// Podium page — final results display for complete and archived competitions
import { notFound, redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getLeaderboard } from '@repo/supabase';
import { PodiumStand } from '@/components/podium/PodiumStand';
import { PodiumCard } from '@/components/podium/PodiumCard';
import { FullResultsTable } from '@/components/podium/FullResultsTable';
import { ArchiveCompetitionButton } from '@/components/podium/ArchiveCompetitionButton';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Finisher {
  profile_id: string;
  final_rank: number | null;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  events_completed: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    country_code: string | null;
  } | null;
}

interface Props {
  params: { id: string };
}

export default async function PodiumPage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const [{ data: compData }, { data: leaderboardData }] = await Promise.all([
    getCompetition(client, params.id),
    getLeaderboard(client, params.id),
  ]);

  if (!compData) notFound();

  const competition = compData as CompetitionRow;

  if (competition.status !== 'complete' && competition.status !== 'archived') {
    redirect(ROUTES.COMPETITION_LEADERBOARD(params.id));
  }

  const finishers = ((leaderboardData ?? []) as Finisher[]).sort(
    (a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999),
  );

  const isHost = competition.host_id === user.id;
  const first = finishers.find((f) => f.final_rank === 1);
  const second = finishers.find((f) => f.final_rank === 2);
  const third = finishers.find((f) => f.final_rank === 3);
  const rest = finishers.filter((f) => (f.final_rank ?? 0) > 3);

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-grey-900">
          {competition.status === 'archived' ? 'Final Results' : '🏆 Competition Complete'}
        </h2>
        <p className="mt-1 text-sm text-grey-500">{competition.name}</p>
      </div>

      {(first ?? second ?? third) && (
        <div className="flex items-end justify-center gap-2">
          {second && (
            <PodiumStand place={2}>
              <PodiumCard
                profileId={second.profile_id}
                displayName={second.profiles?.display_name ?? 'Unknown'}
                avatarUrl={second.profiles?.avatar_url ?? null}
                countryCode={second.profiles?.country_code ?? null}
                totalPoints={second.total_points}
                gold={second.gold_count}
                silver={second.silver_count}
                bronze={second.bronze_count}
                place={2}
              />
            </PodiumStand>
          )}

          {first && (
            <PodiumStand place={1}>
              <PodiumCard
                profileId={first.profile_id}
                displayName={first.profiles?.display_name ?? 'Unknown'}
                avatarUrl={first.profiles?.avatar_url ?? null}
                countryCode={first.profiles?.country_code ?? null}
                totalPoints={first.total_points}
                gold={first.gold_count}
                silver={first.silver_count}
                bronze={first.bronze_count}
                place={1}
              />
            </PodiumStand>
          )}

          {third && (
            <PodiumStand place={3}>
              <PodiumCard
                profileId={third.profile_id}
                displayName={third.profiles?.display_name ?? 'Unknown'}
                avatarUrl={third.profiles?.avatar_url ?? null}
                countryCode={third.profiles?.country_code ?? null}
                totalPoints={third.total_points}
                gold={third.gold_count}
                silver={third.silver_count}
                bronze={third.bronze_count}
                place={3}
              />
            </PodiumStand>
          )}
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-grey-500">All finishers</h3>
          <FullResultsTable finishers={finishers} currentUserId={user.id} />
        </div>
      )}

      {rest.length === 0 && finishers.length > 0 && (
        <FullResultsTable finishers={finishers} currentUserId={user.id} />
      )}

      {isHost && competition.status === 'complete' && (
        <div className="flex justify-end">
          <ArchiveCompetitionButton competitionId={competition.id} />
        </div>
      )}
    </div>
  );
}
