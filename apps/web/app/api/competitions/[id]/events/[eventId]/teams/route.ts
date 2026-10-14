/*
 * This file handles requests for the teams API route.
 */

// GET /api/competitions/[id]/events/[eventId]/teams — player pool, ratings and teams for a team event.
// POST — host or co-host balances the players into teams, or (action "pool") gathers players
// into the pool, adding anyone who joined after the event started.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, createAdminClient } from '@repo/supabase';
import { assignBalancedTeams, ensurePlayerPool, getTeamEventState } from '@/lib/teams/team-event';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

// Handles get.
export async function GET(_request: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  // RLS only returns the event to competition members.
  const { data: event } = await client
    .from('competition_events')
    .select('id')
    .eq('id', eventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Event not found' } }, { status: 404 });

  const state = await getTeamEventState(createAdminClient(), id, eventId, user.id);
  return NextResponse.json({ data: state, error: null });
}

// Handles post.
export async function POST(request: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Host or co-host only' } }, { status: 403 });
  }

  let body: { team_count?: unknown; action?: unknown };
  try {
    body = (await request.json()) as { team_count?: unknown; action?: unknown };
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const teamCount = Number(body.team_count ?? 2);
  if (body.action !== 'pool' && (!Number.isInteger(teamCount) || teamCount < 2)) {
    return NextResponse.json({ error: 'team_count must be an integer of at least 2' }, { status: 400 });
  }

  const { data: event } = await adminClient
    .from('competition_events')
    .select('id, status, events(is_team_event)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!(event.events as unknown as { is_team_event: boolean } | null)?.is_team_event) {
    return NextResponse.json({ error: 'Teams can only be assigned for team events' }, { status: 400 });
  }
  if (!['active', 'results_pending'].includes(event.status)) {
    return NextResponse.json({ error: 'Start the event before assigning teams' }, { status: 409 });
  }

  if (body.action === 'pool') {
    const { error: poolError, added } = await ensurePlayerPool(adminClient, id, eventId);
    if (poolError) return NextResponse.json({ error: poolError }, { status: 500 });
    const poolState = await getTeamEventState(adminClient, id, eventId, user.id);
    return NextResponse.json({ data: { ...poolState, added }, error: null });
  }

  const { error, withinTolerance } = await assignBalancedTeams(adminClient, eventId, teamCount);
  if (error) return NextResponse.json({ error }, { status: 409 });

  const state = await getTeamEventState(adminClient, id, eventId, user.id);
  return NextResponse.json({ data: { ...state, withinTolerance }, error: null });
}
