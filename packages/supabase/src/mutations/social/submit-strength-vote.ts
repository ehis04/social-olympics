// Submits a strength rating vote and checks if majority threshold is reached.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export interface StrengthVoteResult {
  vote: unknown;
  outcome?: 'confirmed' | 'round2_required' | 'host_required';
}

export async function submitStrengthVote(
  client: SupabaseClient,
  payload: Record<string, unknown>,
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
      vote_type: string;
      submission_round: number;
    } | null;

    if (!v) return { data: { vote }, error: null };

    // Check vote totals for this team member
    const { data: votes } = await client
      .from('strength_rating_votes')
      .select('vote_type')
      .eq('team_member_id', v.team_member_id);

    const allVotes = votes ?? [];
    const total = allVotes.length;
    const confirms = allVotes.filter((x: { vote_type: string }) => x.vote_type === 'confirm').length;
    const rejects = allVotes.filter((x: { vote_type: string }) => x.vote_type === 'reject').length;
    const majority = Math.ceil(total / 2);

    if (confirms >= majority) {
      await client
        .from('team_members')
        .update({ rating_source: 'peer_voted', confirmed_at: new Date().toISOString() })
        .eq('id', v.team_member_id);

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
