/*
 * This file handles requests for the strength-rating API route.
 */

// POST /api/competitions/[id]/events/[eventId]/strength-rating — a player declares their own rating.
// PATCH — the host or co-host sets a player's rating directly.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

interface EventContext {
  status: string;
  competitions: { host_id: string; cohost_id: string | null; status: string } | null;
}

// Handles load event context.
async function loadEventContext(competitionId: string, eventId: string) {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('competition_events')
    .select('status, competitions(host_id, cohost_id, status)')
    .eq('id', eventId)
    .eq('competition_id', competitionId)
    .maybeSingle();
  return { adminClient, event: data as unknown as EventContext | null };
}

// Handles parse rating.
function parseRating(value: unknown): number | null {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) return null;
  return Math.round(rating * 10) / 10;
}

// Handles post.
export async function POST(request: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  let body: { self_rating?: unknown };
  try {
    body = (await request.json()) as { self_rating?: unknown };
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }
  const rating = parseRating(body.self_rating);
  if (rating === null) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Choose a rating between 1 and 10' } }, { status: 400 });
  }

  const { adminClient, event } = await loadEventContext(id, eventId);
  if (!event?.competitions) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (['complete', 'archived'].includes(event.competitions.status) || !['active', 'results_pending'].includes(event.status)) {
    return NextResponse.json({ error: 'Ratings can only be changed while the event is live' }, { status: 409 });
  }

  const { data: teamMember } = await adminClient
    .from('team_members')
    .select('id, confirmed_at, teams!inner(competition_event_id)')
    .eq('profile_id', user.id)
    .eq('teams.competition_event_id', eventId)
    .maybeSingle();
  if (!teamMember) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'You are not playing in this event' } }, { status: 404 });
  }
  if (teamMember.confirmed_at) {
    return NextResponse.json({ error: 'Your rating has already been confirmed' }, { status: 409 });
  }

  const { count: votesCast } = await adminClient
    .from('strength_rating_votes')
    .select('id', { count: 'exact', head: true })
    .eq('team_member_id', teamMember.id);
  if ((votesCast ?? 0) > 0) {
    return NextResponse.json({ error: 'Voting on your rating has started, so it can no longer be changed' }, { status: 409 });
  }

  const { data, error } = await adminClient
    .from('team_members')
    .update({ strength_rating: rating, rating_source: 'peer_voted' })
    .eq('id', teamMember.id)
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}

// Handles patch.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: { team_member_id?: unknown; rating?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const rating = parseRating(body.rating);
  if (typeof body.team_member_id !== 'string' || rating === null) {
    return NextResponse.json({ error: 'Choose a player and a rating between 1 and 10' }, { status: 400 });
  }

  const { adminClient, event } = await loadEventContext(id, eventId);
  if (!event?.competitions) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (event.competitions.host_id !== user.id && event.competitions.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Only the host or co-host can set ratings' }, { status: 403 });
  }
  if (['complete', 'archived'].includes(event.competitions.status) || !['active', 'results_pending'].includes(event.status)) {
    return NextResponse.json({ error: 'Ratings can only be changed while the event is live' }, { status: 409 });
  }

  const { data: target } = await adminClient
    .from('team_members')
    .select('id, teams!inner(competition_event_id)')
    .eq('id', body.team_member_id)
    .eq('teams.competition_event_id', eventId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Player not found in this event' }, { status: 404 });

  const { data, error } = await adminClient
    .from('team_members')
    .update({ strength_rating: rating, rating_source: 'host_set', confirmed_at: new Date().toISOString() })
    .eq('id', target.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
