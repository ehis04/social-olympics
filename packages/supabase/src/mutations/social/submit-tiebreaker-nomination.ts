// Submits a tiebreaker nomination and reveals both if both players have submitted.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export interface TiebreakerNominationResult {
  nomination: unknown;
  bothRevealed: boolean;
  nominations?: unknown[];
}

export async function submitTiebreakerNomination(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<ApiResponse<TiebreakerNominationResult>> {
  try {
    const { data: nomination, error } = await client
      .from('tiebreaker_nominations')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    const n = nomination as { tiebreaker_id: string } | null;
    if (!n) return { data: { nomination, bothRevealed: false }, error: null };

    // Check if both players have now submitted for this tiebreaker
    const { data: allNominations } = await client
      .from('tiebreaker_nominations')
      .select('*')
      .eq('tiebreaker_id', n.tiebreaker_id);

    const nominations = allNominations ?? [];

    if (nominations.length >= 2) {
      const revealedAt = new Date().toISOString();
      await client
        .from('tiebreaker_nominations')
        .update({ revealed_at: revealedAt })
        .eq('tiebreaker_id', n.tiebreaker_id);

      return { data: { nomination, bothRevealed: true, nominations }, error: null };
    }

    return { data: { nomination, bothRevealed: false }, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
