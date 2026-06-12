// Browser Supabase client for React client components and React Native.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

let client: SupabaseClient<Database> | undefined;

export function createBrowserClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['EXPO_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !key) {
    throw new Error('Missing Supabase URL or anon key environment variables');
  }

  client = createClient<Database>(url, key);
  return client;
}
