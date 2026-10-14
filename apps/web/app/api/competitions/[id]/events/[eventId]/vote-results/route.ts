/*
 * This file handles requests for the vote results API route.
 */

// GET /api/competitions/[id]/events/[eventId]/vote-results — fetch finalised awards. POST — finalise them.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { finaliseEventAwards } from '@/lib/scoring/awards';

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

interface VoteResultRow {
  vote_type: string;
  winner_profile_id: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

// Handles get.
export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data, error } = await client
    .from('performance_vote_results')
    .select('vote_type, winner_profile_id, profiles!performance_vote_results_winner_profile_id_fkey(id, display_name, avatar_url)')
    .eq('competition_event_id', (await params).eventId);

  if (error) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: 500 });

  const rows = (data ?? []) as VoteResultRow[];
  const mvpRow = rows.find((r) => r.vote_type === 'mvp');
  const worstRow = rows.find((r) => r.vote_type === 'worst_performer');

  return NextResponse.json({
    data: {
      mvp: mvpRow?.profiles ?? null,
      worst_performer: worstRow?.profiles ?? null,
    },
    error: null,
  });
}

// POST — host or co-host finalises the MVP and worst-performer awards for a confirmed event.
export async function POST(_req: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: competition } = await adminClient
    .from('competitions')
    .select('id, name, host_id, cohost_id, status, mvp_voting_enabled, worst_performer_enabled')
    .eq('id', id)
    .maybeSingle();
  if (!competition) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Only the host or co-host can finalise awards' } }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ data: null, error: { code: 'VOTING_CLOSED', message: 'This competition is finished.' } }, { status: 409 });
  }

  const { data: event } = await adminClient
    .from('competition_events')
    .select('id, status, name_override, events(name)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Event not found' } }, { status: 404 });
  if (event.status !== 'confirmed') {
    return NextResponse.json({ data: null, error: { code: 'VOTING_NOT_OPEN', message: 'Awards can be finalised once results are confirmed and no dispute is open' } }, { status: 409 });
  }

  const eventName = event.name_override ?? (event.events as unknown as { name: string } | null)?.name ?? 'this event';
  const outcomes = await finaliseEventAwards(adminClient, competition, eventId, eventName);
  return NextResponse.json({ data: { outcomes }, error: null });
}
