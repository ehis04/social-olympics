/*
 * This file renders the eventId application page.
 */

// Event detail page — server component fetching event, results, votes, awards, disputes and teams.
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import {
  createAdminClient,
  getCompetitionEvent,
  getCompetition,
  getCompetitionMembers,
  getResultsForEvent,
} from '@repo/supabase';
import type { Database } from '@repo/types';
import { EventDetail } from '@/components/events/EventDetail';
import { getTeamEventState } from '@/lib/teams/team-event';
import type { OpenDispute } from '@/components/events/HostDisputePanel';
import type { AwardWinner } from '@/components/events/EventAwardsPanel';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface EventDetailPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

interface ResultRow {
  id: string;
  profile_id: string;
  result_value_primary: number | null;
  is_dnf: boolean;
  finishing_place: number | null;
  profiles: { display_name: string } | null;
  result_disputes: { id: string; status: string; reason: string; created_at: string }[] | null;
}

// Renders the event detail page component.
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  const [
    { data: eventData, error: eventError },
    { data: competitionData, error: compError },
    { data: membersData },
    { data: resultsData },
  ] = await Promise.all([
    getCompetitionEvent(client, eventId),
    getCompetition(client, id),
    getCompetitionMembers(client, id),
    getResultsForEvent(client, eventId),
  ]);

  if (eventError || compError || !eventData || !competitionData) {
    notFound();
  }

  const event = eventData as Record<string, unknown>;
  if (event.competition_id !== id) notFound();

  const competition = competitionData as CompetitionRow;
  const members = (membersData ?? []) as MemberRow[];
  const results = (resultsData ?? []) as Record<string, unknown>[];
  const currentMember = members.find((m) => m.profile_id === user?.id) ?? null;
  const isHost = competition.host_id === user?.id || competition.cohost_id === user?.id;
  const memberRole = currentMember?.status === 'active' ? currentMember.role : null;
  const isTeamEvent = !!(event.events as Record<string, unknown> | null)?.is_team_event;
  const adminClient = createAdminClient();

  const [{ data: awardRows }, { data: myVoteRows }, teamState, ballotCounts] = await Promise.all([
    client
      .from('performance_vote_results')
      .select('vote_type, winner_profile_id, vote_count, profiles!performance_vote_results_winner_profile_id_fkey(display_name)')
      .eq('competition_event_id', eventId),
    user
      ? client
        .from('performance_votes')
        .select('vote_type, voted_for_profile_id')
        .eq('competition_event_id', eventId)
        .eq('voter_profile_id', user.id)
      : Promise.resolve({ data: [] as { vote_type: string; voted_for_profile_id: string }[] }),
    isTeamEvent ? getTeamEventState(adminClient, id, eventId, user?.id ?? null) : Promise.resolve(null),
    isHost
      ? Promise.all((['mvp', 'worst_performer'] as const).map((voteType) =>
        adminClient
          .from('performance_votes')
          .select('id', { count: 'exact', head: true })
          .eq('competition_event_id', eventId)
          .eq('vote_type', voteType),
      )).then(([mvp, worst]) => ({ mvp: mvp?.count ?? 0, worst: worst?.count ?? 0 }))
      : Promise.resolve(null),
  ]);

  const toWinner = (voteType: string): AwardWinner | null => {
    const row = (awardRows ?? []).find((award) => award.vote_type === voteType);
    if (!row) return null;
    return {
      profileId: row.winner_profile_id as string,
      displayName: (row.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Unknown',
      voteCount: row.vote_count as number,
    };
  };

  const openDisputes: OpenDispute[] = (results as unknown as ResultRow[]).flatMap((result) =>
    (result.result_disputes ?? [])
      .filter((dispute) => dispute.status === 'open')
      .map((dispute) => ({
        disputeId: dispute.id,
        reason: dispute.reason,
        raisedAt: dispute.created_at,
        displayName: result.profiles?.display_name ?? 'Unknown',
        resultValue: result.result_value_primary,
        isDnf: result.is_dnf,
        place: result.finishing_place,
      })),
  );

  return (
    <EventDetail
      event={event}
      competition={competition}
      results={results}
      members={members as Record<string, unknown>[]}
      currentUserId={user?.id ?? null}
      isHost={isHost}
      memberRole={memberRole}
      existingMvpVote={(myVoteRows ?? []).find((vote) => vote.vote_type === 'mvp')?.voted_for_profile_id ?? null}
      existingWorstVote={(myVoteRows ?? []).find((vote) => vote.vote_type === 'worst_performer')?.voted_for_profile_id ?? null}
      mvpAward={toWinner('mvp')}
      worstAward={toWinner('worst_performer')}
      ballotCounts={ballotCounts}
      teamState={teamState}
      openDisputes={isHost ? openDisputes : []}
    />
  );
}
