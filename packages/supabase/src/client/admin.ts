// Admin Supabase client using the service role key — bypasses RLS entirely.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    throw new Error('Missing Supabase URL or service role key environment variables');
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
