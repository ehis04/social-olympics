import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@repo/supabase';

export async function ensureProfile(user: User) {
  const adminClient = createAdminClient();
  const { data: existing, error: fetchError } = await adminClient
    .from('profiles')
    .select('*, career_stats(*)')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) return { data: null, error: fetchError };
  if (existing) return { data: existing, error: null };

  const candidateName =
    typeof user.user_metadata['display_name'] === 'string' && user.user_metadata['display_name'].trim()
      ? user.user_metadata['display_name'].trim()
      : user.email?.split('@')[0] ?? 'Competitor';
  const displayName = candidateName.length >= 2 ? candidateName : 'Competitor';

  const { data, error } = await adminClient
    .from('profiles')
    .insert({
      id: user.id,
      display_name: displayName.slice(0, 30),
      country_code:
        typeof user.user_metadata['country_code'] === 'string'
          ? user.user_metadata['country_code']
          : null,
      is_ghost: false,
    })
    .select('*, career_stats(*)')
    .single();

  return { data, error };
}
