// Admin Supabase client using the service role key — bypasses RLS entirely.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === '127.0.0.1' || hostname === 'localhost';
  } catch {
    return false;
  }
}

function isJwtKey(key: string): boolean {
  return key.split('.').length === 3;
}

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  let key = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!url || !key) {
    throw new Error('Missing Supabase URL or service role key environment variables');
  }

  if (isLocalSupabaseUrl(url) && !isJwtKey(key)) {
    key = LOCAL_SERVICE_ROLE_KEY;
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
