// supabase/functions/_shared/supabase-client.ts
// Admin Supabase client using service role key for privileged operations

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createUserClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization') ?? '' },
    },
  });
}