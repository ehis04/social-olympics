// Soft-deletes a message — blanks content and sets deleted_at, row is preserved.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function deleteMessage(
  client: SupabaseClient,
  messageId: string,
): Promise<ApiResponse<void>> {
  try {
    const { error } = await client
      .from('messages')
      .update({ deleted_at: new Date().toISOString(), content: '[deleted]' })
      .eq('id', messageId);

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
