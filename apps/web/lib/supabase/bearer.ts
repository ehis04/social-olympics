import { createClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

export function getBearerToken(headers: Headers): string | null {
  return headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

// A request-scoped client: Supabase validates the JWT and applies its RLS role.
export function createBearerClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase URL or anon key environment variables');

  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
