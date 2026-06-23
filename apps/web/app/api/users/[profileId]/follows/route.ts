// GET /api/users/[profileId]/follows — follower/following lists for a profile
import { NextResponse } from 'next/server';
import { createAdminClient } from '@repo/supabase';
import { getServerClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

type ProfileSnippet = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'avatar_url' | 'bio' | 'country_code'
>;

interface Params {
  params: Promise<{ profileId: string }>;
}

interface FollowRelation {
  created_at: string;
  profile: ProfileSnippet | ProfileSnippet[] | null;
}

function normalizeRows(rows: FollowRelation[] | null): Array<ProfileSnippet & { followed_at: string }> {
  return (rows ?? []).flatMap((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return profile ? [{ ...profile, followed_at: row.created_at }] : [];
  });
}

function untyped(client: SupabaseClient): SupabaseClient {
  return client;
}

export async function GET(_request: Request, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { profileId } = await params;
  const adminClient = untyped(createAdminClient());

  const [followersResult, followingResult] = await Promise.all([
    adminClient
      .from('profile_follows')
      .select('created_at, profile:profiles!profile_follows_follower_id_fkey(id, display_name, avatar_url, bio, country_code)')
      .eq('following_id', profileId)
      .order('created_at', { ascending: false }),
    adminClient
      .from('profile_follows')
      .select('created_at, profile:profiles!profile_follows_following_id_fkey(id, display_name, avatar_url, bio, country_code)')
      .eq('follower_id', profileId)
      .order('created_at', { ascending: false }),
  ]);

  if (followersResult.error) {
    return NextResponse.json({ error: followersResult.error.message }, { status: 500 });
  }

  if (followingResult.error) {
    return NextResponse.json({ error: followingResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
      data: {
      followers: normalizeRows(followersResult.data as unknown as FollowRelation[] | null),
      following: normalizeRows(followingResult.data as unknown as FollowRelation[] | null),
    },
  });
}
