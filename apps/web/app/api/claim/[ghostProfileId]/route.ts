// POST /api/claim/[ghostProfileId] — authenticated user claims a ghost profile
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, claimGhostProfile } from '@repo/supabase';

interface Params {
  params: { ghostProfileId: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Verify ghost profile exists, is unclaimed, and is actually a ghost
  const { data: ghost, error: fetchError } = await client
    .from('profiles')
    .select('id, is_ghost, claimed_by')
    .eq('id', params.ghostProfileId)
    .single();

  if (fetchError || !ghost) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  if (!ghost.is_ghost) {
    return NextResponse.json({ error: 'This is not a guest profile' }, { status: 400 });
  }
  if (ghost.claimed_by) {
    return NextResponse.json({ error: 'This profile has already been claimed' }, { status: 409 });
  }

  // Verify user has not already claimed a different ghost profile
  const { data: alreadyClaimed } = await client
    .from('profiles')
    .select('id')
    .eq('claimed_by', user.id)
    .single();

  if (alreadyClaimed) {
    return NextResponse.json(
      { error: 'You have already claimed a guest profile' },
      { status: 409 },
    );
  }

  const adminClient = createAdminClient();
  const { error: claimError } = await claimGhostProfile(adminClient, params.ghostProfileId, user.id);
  if (claimError) {
    return NextResponse.json({ error: 'Failed to claim profile' }, { status: 500 });
  }

  // Find the competition the ghost was a member of
  const { data: memberRow } = await client
    .from('competition_members')
    .select('competition_id')
    .eq('profile_id', params.ghostProfileId)
    .limit(1)
    .single();

  const competitionId = memberRow?.competition_id ?? null;

  return NextResponse.json({ data: { competitionId } });
}
