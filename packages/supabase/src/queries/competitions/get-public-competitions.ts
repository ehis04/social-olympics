// Fetches paginated public competitions with optional filtering.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResponse } from '@repo/types';

export interface CompetitionSearchParams {
  q?: string;
  country_code?: string;
  city?: string;
  limit?: number;
  cursor?: string;
}

export async function getPublicCompetitions(
  client: SupabaseClient,
  params: CompetitionSearchParams = {},
): Promise<PaginatedResponse<unknown>> {
  try {
    const limit = params.limit ?? 20;

    let query = client
      .from('competitions')
      .select('id, name, description, status, country_code, city, is_public, created_at, total_events, host_id')
      .eq('is_public', true)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (params.q) query = query.ilike('name', `%${params.q}%`);
    if (params.country_code) query = query.eq('country_code', params.country_code);
    if (params.city) query = query.ilike('city', `%${params.city}%`);
    if (params.cursor) query = query.lt('created_at', params.cursor);

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

// Re-export helper for compatibility with tests that import it from this module.
export { getCompetitionByInviteCode } from './get-competition-by-invite-code';
