// Marks a competition complete and writes final_rank to all members (admin only).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function completeCompetition(
  adminClient: SupabaseClient,
  id: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data: competition, error: updateError } = await adminClient
      .from('competitions')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) return { data: null, error: { code: updateError.code, message: updateError.message } };

    // Fetch members ordered by points to assign final_rank (dense ranking)
    const { data: members, error: membersError } = await adminClient
      .from('competition_members')
      .select('id, total_points, gold_count, silver_count, bronze_count')
      .eq('competition_id', id)
      .order('total_points', { ascending: false })
      .order('gold_count', { ascending: false })
      .order('silver_count', { ascending: false })
      .order('bronze_count', { ascending: false });

    if (membersError) return { data: null, error: { code: membersError.code, message: membersError.message } };

    // Assign dense ranks
    let currentRank = 1;
    for (let i = 0; i < (members ?? []).length; i++) {
      const member = (members ?? [])[i] as { id: string; total_points: number } | undefined;
      const prev = (members ?? [])[i - 1] as { total_points: number } | undefined;

      if (i > 0 && member !== undefined && prev !== undefined && member.total_points !== prev.total_points) {
        currentRank++;
      }

      if (member !== undefined) {
        await adminClient
          .from('competition_members')
          .update({ final_rank: currentRank })
          .eq('id', member.id);
      }
    }

    return { data: competition, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
