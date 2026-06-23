import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

// GET — list participants assigned to this event (competition members only)
export async function GET(_req: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();

  // Verify caller is an active member or host of this competition
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;
  const isHost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHost) {
    const { data: membership } = await adminClient
      .from('competition_members')
      .select('id')
      .eq('competition_id', id)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data } = await adminClient
    .from('competition_event_participants')
    .select('profile_id, profiles(id, display_name, avatar_url)')
    .eq('competition_event_id', eventId);

  return NextResponse.json({ data: data ?? [] });
}

// PUT — replace the full participant list for an event (host only)
export async function PUT(req: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { profileIds: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.profileIds)) {
    return NextResponse.json({ error: 'profileIds must be an array' }, { status: 400 });
  }

  // Delete existing then insert new — check delete error before proceeding
  const { error: deleteError } = await adminClient
    .from('competition_event_participants')
    .delete()
    .eq('competition_event_id', eventId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  if (body.profileIds.length > 0) {
    const rows = body.profileIds.map((profileId) => ({
      competition_event_id: eventId,
      profile_id: profileId,
      assigned_by: user.id,
    }));
    const { error } = await adminClient
      .from('competition_event_participants')
      .insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { updated: body.profileIds.length } });
}
