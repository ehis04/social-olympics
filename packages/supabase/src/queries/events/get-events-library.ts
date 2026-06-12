// Fetches active events from the library, optionally filtered by category.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getEventsLibrary(
  client: SupabaseClient,
  categorySlug?: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    let query = client
      .from('events')
      .select('*, event_categories(name, slug)')
      .eq('is_active', true)
      .order('event_categories(name)', { ascending: true })
      .order('name', { ascending: true });

    if (categorySlug) {
      const { data: category } = await client
        .from('event_categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();

      if (category) {
        query = query.eq('category_id', (category as { id: string }).id);
      }
    }

    const { data, error } = await query;
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
