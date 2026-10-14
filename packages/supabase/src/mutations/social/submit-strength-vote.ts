/*
 * This file defines the submit strength vote module.
 */

// Submits a strength rating vote and checks if majority threshold is reached.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, Database } from '@repo/types';

export interface StrengthVoteResult {
  vote: unknown;
  outcome?: 'confirmed' | 'round2_required' | 'host_required';
}

// Handles submit strength vote.
export async function submitStrengthVote(
  client: SupabaseClient<Database>,
  payload: Database['public']['Tables']['strength_rating_votes']['Insert'],
): Promise<ApiResponse<StrengthVoteResult>> {
  try {
    const { data: vote, error } = await client
      .from('strength_rating_votes')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    const v = vote as {
      team_member_id: string;
      vote: string;
      submission_round: number;
    } | null;

    if (!v) return { data: { vote }, error: null };

    // Check vote totals for this team member
    const { data: votes } = await client
      .from('strength_rating_votes')
      .select('vote')
      .eq('team_member_id', v.team_member_id)
      .eq('submission_round', v.submission_round);

    const { data: target } = await client.from('team_members')
      .select('profile_id, teams(competition_events(competition_id))').eq('id', v.team_member_id).single();
    const competitionId = target?.teams?.competition_events?.competition_id;
    const { count: eligibleVoters } = competitionId ? await client.from('competition_members')
      .select('id', { count: 'exact', head: true }).eq('competition_id', competitionId)
      .eq('status', 'active').eq('role', 'competitor').neq('profile_id', target.profile_id)
      : { count: null };
    if (!eligibleVoters) return { data: { vote }, error: null };

    const allVotes = votes ?? [];
    const confirms = allVotes.filter((x: { vote: string }) => x.vote === 'confirm').length;
    const rejects = allVotes.filter((x: { vote: string }) => x.vote === 'reject').length;
    const majority = Math.floor(eligibleVoters / 2) + 1;

    if (confirms >= majority) {
      const { error: updateError } = await client
        .from('team_members')
        .update({ rating_source: 'peer_voted', confirmed_at: new Date().toISOString() })
        .eq('id', v.team_member_id);
      if (updateError) return { data: null, error: { code: updateError.code, message: updateError.message } };

      return { data: { vote, outcome: 'confirmed' }, error: null };
    }

    if (rejects >= majority) {
      const outcome = v.submission_round === 1 ? 'round2_required' : 'host_required';
      return { data: { vote, outcome }, error: null };
    }

    return { data: { vote }, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
