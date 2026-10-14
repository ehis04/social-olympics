import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse, Database } from '@repo/types';

export type CompetitionHistoryEntry = Pick<Database['public']['Tables']['competition_members']['Row'],
  'competition_id' | 'total_points' | 'events_completed' | 'final_rank' | 'gold_count' | 'silver_count' | 'bronze_count'> & {
  competitions: Pick<Database['public']['Tables']['competitions']['Row'],
    'id' | 'name' | 'status' | 'total_events' | 'completed_at'>;
};

// Use the viewer's client so private competition history stays behind RLS.
export async function getCompetitionHistory(client: SupabaseClient<Database>, profileId: string): Promise<ApiResponse<CompetitionHistoryEntry[]>> {
  const { data, error } = await client.from('competition_members')
    .select('competition_id,total_points,events_completed,final_rank,gold_count,silver_count,bronze_count,competitions!inner(id,name,status,total_events,completed_at)')
    .eq('profile_id', profileId).eq('status', 'active')
    .order('joined_at', { ascending: false });
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: data ?? [], error: null };
}
