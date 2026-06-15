// supabase/functions/close-voting/index.ts
// Closes MVP and worst performer voting, tallies votes, applies bonus/penalty points.

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestBody {
  competition_event_id: string;
}

interface VoteRow {
  voted_for_profile_id: string;
  vote_type: string;
}

interface VoteTally {
  profile_id: string;
  vote_count: number;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    const user = await getAuthenticatedUser(req, userClient);
    const admin = createAdminClient();

    const body: RequestBody = await req.json();
    if (!body.competition_event_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'competition_event_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch event and verify caller is host or cohost
    const { data: eventData } = await admin
      .from('competition_events')
      .select('competition_id, status, voting_closes_at')
      .eq('id', body.competition_event_id)
      .single();

    if (!eventData) {
      return new Response(JSON.stringify({ success: false, error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ev = eventData as { competition_id: string; status: string; voting_closes_at: string | null };

    const { data: comp } = await admin
      .from('competitions')
      .select('host_id, cohost_id')
      .eq('id', ev.competition_id)
      .single();

    const c = comp as { host_id: string; cohost_id: string | null } | null;
    if (!c || (c.host_id !== user.profileId && c.cohost_id !== user.profileId)) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all performance votes for this event
    const { data: votes, error: votesError } = await admin
      .from('performance_votes')
      .select('voted_for_profile_id, vote_type')
      .eq('competition_event_id', body.competition_event_id);

    if (votesError) throw new Error(votesError.message);

    const allVotes = (votes ?? []) as VoteRow[];

    // Tally by vote_type
    function tally(voteType: string): VoteTally[] {
      const counts = new Map<string, number>();
      for (const v of allVotes.filter((v) => v.vote_type === voteType)) {
        counts.set(v.voted_for_profile_id, (counts.get(v.voted_for_profile_id) ?? 0) + 1);
      }
      return Array.from(counts.entries())
        .map(([profile_id, vote_count]) => ({ profile_id, vote_count }))
        .sort((a, b) => b.vote_count - a.vote_count);
    }

    const mvpTally = tally('mvp');
    const worstTally = tally('worst_performer');

    const mvpWinner = mvpTally[0] ?? null;
    const worstWinner = worstTally[0] ?? null;

    // Insert vote result rows
    const resultRows = [];
    if (mvpWinner) {
      resultRows.push({
        competition_event_id: body.competition_event_id,
        vote_type: 'mvp',
        winner_profile_id: mvpWinner.profile_id,
        vote_count: mvpWinner.vote_count,
      });
    }
    if (worstWinner) {
      resultRows.push({
        competition_event_id: body.competition_event_id,
        vote_type: 'worst_performer',
        winner_profile_id: worstWinner.profile_id,
        vote_count: worstWinner.vote_count,
      });
    }

    if (resultRows.length > 0) {
      await admin.from('performance_vote_results').insert(resultRows);
    }

    // Apply bonus points: +1 MVP, -1 worst performer via results update
    const bonusUpdates = [];
    if (mvpWinner) {
      bonusUpdates.push(
        admin
          .from('results')
          .update({ bonus_points: 1 })
          .eq('competition_event_id', body.competition_event_id)
          .eq('profile_id', mvpWinner.profile_id),
      );
    }
    if (worstWinner) {
      bonusUpdates.push(
        admin
          .from('results')
          .update({ bonus_points: -1 })
          .eq('competition_event_id', body.competition_event_id)
          .eq('profile_id', worstWinner.profile_id),
      );
    }
    await Promise.all(bonusUpdates);

    // Mark voting as closed on the event
    await admin
      .from('competition_events')
      .update({ voting_closed: true })
      .eq('id', body.competition_event_id);

    const response: ApiResponse<{ mvp: VoteTally | null; worst_performer: VoteTally | null }> = {
      success: true,
      data: { mvp: mvpWinner, worst_performer: worstWinner },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
