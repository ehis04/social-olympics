// Fetches paginated moderation reports (admin client only).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResponse, PaginationParams } from '@repo/types';

export async function getReports(
  client: SupabaseClient,
  status?: string,
  params: PaginationParams = {},
): Promise<PaginatedResponse<unknown>> {
  try {
    const limit = params.limit ?? 20;

    let query = client
      .from('reports')
      .select('*, reporter:profiles!reports_reporter_profile_id_fkey(id, display_name, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(limit + 1);

    if (status) query = query.eq('status', status);
    if (params.cursor) query = query.gt('created_at', params.cursor);

    const { data, error } = await query;
    if (error) return { data: null, error: { code: error.code, message: error.message }, hasMore: false };

    const items = data ?? [];
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? (results[results.length - 1] as { created_at: string } | undefined)?.created_at : undefined;

    return { data: results, error: null, hasMore, nextCursor };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' }, hasMore: false };
  }
}
