/*
 * This file renders the podium application page.
 */

// Podium page — final results display for complete and archived competitions
import { notFound, redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getLeaderboard } from '@repo/supabase';
import { PodiumStand } from '@/components/podium/PodiumStand';
import { PodiumCard } from '@/components/podium/PodiumCard';
import { FullResultsTable } from '@/components/podium/FullResultsTable';
import { ArchiveCompetitionButton } from '@/components/podium/ArchiveCompetitionButton';
import { NewSeasonButton } from '@/components/podium/NewSeasonButton';
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
  params: Promise<{ id: string }>;
}

// Renders the podium page component.
export default async function PodiumPage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const [{ data: compData }, { data: leaderboardData }] = await Promise.all([
    getCompetition(client, (await params).id),
    getLeaderboard(client, (await params).id),
  ]);

  if (!compData) notFound();

  const competition = compData as CompetitionRow;

  if (competition.status !== 'complete' && competition.status !== 'archived') {
    redirect(ROUTES.COMPETITION_LEADERBOARD((await params).id));
  }

  const finishers = ((leaderboardData ?? []) as Finisher[])
    .filter((finisher) => finisher.final_rank != null)
    .sort((a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999));

  const isHost = competition.host_id === user.id;
  const { data: nextSeason } = isHost
    ? await client
        .from('competitions')
        .select('id, season_number')
        .eq('parent_competition_id', competition.id)
        .limit(1)
        .maybeSingle()
    : { data: null };
  // Final ranks are dense, so competitors who stayed level share a podium place.
  const atPlace = (place: number) => finishers.filter((f) => f.final_rank === place);
  const podium = ([1, 2, 3] as const).map((place) => ({ place, finishers: atPlace(place) }));
  const rest = finishers.filter((f) => (f.final_rank ?? 0) > 3);

  const renderCards = (place: 1 | 2 | 3, group: Finisher[]) => (
    <div className="flex flex-wrap items-end justify-center gap-2">
      {group.map((finisher) => (
        <PodiumCard
          key={finisher.profile_id}
          profileId={finisher.profile_id}
          displayName={finisher.profiles?.display_name ?? 'Unknown'}
          avatarUrl={finisher.profiles?.avatar_url ?? null}
          countryCode={finisher.profiles?.country_code ?? null}
          totalPoints={finisher.total_points}
          gold={finisher.gold_count}
          silver={finisher.silver_count}
          bronze={finisher.bronze_count}
          place={place}
          shared={group.length > 1}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-grey-900">
          {competition.status === 'archived' ? 'Final Results' : '🏆 Competition Complete'}
        </h2>
        <p className="mt-1 text-sm text-grey-500">{competition.name}</p>
      </div>

      {podium.some((step) => step.finishers.length > 0) && (
        <div className="flex items-end justify-center gap-2">
          {podium.map((step) =>
            step.finishers.length > 0 ? (
              <PodiumStand key={step.place} place={step.place}>
                {renderCards(step.place, step.finishers)}
              </PodiumStand>
            ) : null,
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

      {isHost && (
        <div className="flex flex-wrap justify-end gap-3">
          {competition.status === 'complete' && <ArchiveCompetitionButton competitionId={competition.id} />}
          <NewSeasonButton competitionId={competition.id} nextSeason={nextSeason} />
        </div>
      )}
    </div>
  );
}
