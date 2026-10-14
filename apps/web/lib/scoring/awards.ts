/*
 * This file finalises MVP and worst-performer awards for an event.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notifications/create-notification';
import { recalculateScores } from '@/lib/scoring/event-scoring';

type VoteType = 'mvp' | 'worst_performer';

export interface AwardOutcome {
  voteType: VoteType;
  status: 'awarded' | 'no_votes' | 'already_final' | 'disabled';
  winnerProfileId?: string;
  voteCount?: number;
}

interface CompetitionSummary {
  id: string;
  name: string;
  mvp_voting_enabled: boolean;
  worst_performer_enabled: boolean;
}

const BONUS: Record<VoteType, number> = { mvp: 1, worst_performer: -1 };

// Picks the most-voted profile; equal top counts are settled at random, as the host manual describes.
function pickWinner(votes: { voted_for_profile_id: string }[]): { profileId: string; count: number } | null {
  const tally = new Map<string, number>();
  for (const vote of votes) tally.set(vote.voted_for_profile_id, (tally.get(vote.voted_for_profile_id) ?? 0) + 1);
  if (tally.size === 0) return null;
  const top = Math.max(...tally.values());
  const leaders = [...tally].filter(([, count]) => count === top).map(([profileId]) => profileId);
  const profileId = leaders[Math.floor(Math.random() * leaders.length)]!;
  return { profileId, count: top };
}

// Tallies the event's ballots, stores the awards, applies the bonus/penalty and notifies winners.
export async function finaliseEventAwards(
  adminClient: SupabaseClient,
  competition: CompetitionSummary,
  competitionEventId: string,
  eventName: string,
): Promise<AwardOutcome[]> {
  const outcomes: AwardOutcome[] = [];
  const { data: existing } = await adminClient
    .from('performance_vote_results')
    .select('vote_type')
    .eq('competition_event_id', competitionEventId);
  const finalised = new Set((existing ?? []).map((row) => row.vote_type as VoteType));
  const winners: string[] = [];

  for (const voteType of ['mvp', 'worst_performer'] as VoteType[]) {
    const enabled = voteType === 'mvp' ? competition.mvp_voting_enabled : competition.worst_performer_enabled;
    if (!enabled) {
      outcomes.push({ voteType, status: 'disabled' });
      continue;
    }
    if (finalised.has(voteType)) {
      outcomes.push({ voteType, status: 'already_final' });
      continue;
    }

    const { data: votes } = await adminClient
      .from('performance_votes')
      .select('voted_for_profile_id')
      .eq('competition_event_id', competitionEventId)
      .eq('vote_type', voteType);
    const winner = pickWinner(votes ?? []);
    if (!winner) {
      outcomes.push({ voteType, status: 'no_votes' });
      continue;
    }

    const { error } = await adminClient.from('performance_vote_results').insert({
      competition_event_id: competitionEventId,
      vote_type: voteType,
      winner_profile_id: winner.profileId,
      vote_count: winner.count,
      bonus_points: BONUS[voteType],
    });
    if (error) {
      outcomes.push({ voteType, status: 'already_final' });
      continue;
    }

    winners.push(winner.profileId);
    outcomes.push({ voteType, status: 'awarded', winnerProfileId: winner.profileId, voteCount: winner.count });

    if (voteType === 'mvp') {
      await adminClient.from('activity_feed').insert({
        competition_id: competition.id,
        event_type: 'mvp_awarded',
        actor_profile_id: winner.profileId,
        subject_profile_id: winner.profileId,
        competition_event_id: competitionEventId,
        metadata: { event_name: eventName, vote_count: winner.count },
      });
    }

    await createNotifications(adminClient, [{
      profileId: winner.profileId,
      type: voteType === 'mvp' ? 'mvp_awarded' : 'worst_performer_awarded',
      title: voteType === 'mvp' ? 'You were voted MVP' : 'Worst performer vote',
      body: voteType === 'mvp'
        ? `You were voted MVP in ${eventName} (+1 point).`
        : `You were voted worst performer in ${eventName} (−1 point). Better luck next time!`,
      data: {
        competition_id: competition.id,
        competition_event_id: competitionEventId,
        href: `/competitions/${competition.id}/events/${competitionEventId}`,
      },
    }]);
  }

  if (winners.length > 0) await recalculateScores(adminClient, competition.id, winners);
  return outcomes;
}
