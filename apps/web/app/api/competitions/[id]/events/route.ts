// PATCH /api/competitions/[id]/events/[eventId] — update. DELETE — remove.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, updateCompetitionEvent, removeCompetitionEvent } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type CompEventRow = Database['public']['Tables']['competition_events']['Row'];

interface RouteParams {
  params: { id: string; eventId: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  delete body.event_id;

  if (body.weight_tag && !body.weight_multiplier) {
    body.weight_multiplier = weightTagToMultiplier(body.weight_tag as string);
  }

  const { data, error } = await updateCompetitionEvent(client, params.eventId, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: eventData } = await client
    .from('competition_events')
    .select('status')
    .eq('id', params.eventId)
    .single();

  const ev = eventData as Pick<CompEventRow, 'status'> | null;
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const blockedStatuses = ['active', 'confirmed', 'disputed'];
  if (blockedStatuses.includes(ev.status ?? '')) {
    return NextResponse.json(
      { error: 'Cannot remove an event that is active, confirmed, or disputed' },
      { status: 409 },
    );
  }

  const { count } = await client
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('competition_event_id', params.eventId);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Cannot remove an event that has results' }, { status: 409 });
  }

  const { error } = await removeCompetitionEvent(client, params.eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: null }, { status: 200 });
}

function weightTagToMultiplier(tag: string): number {
  const map: Record<string, number> = {
    not_important: 0.5,
    standard: 1.0,
    important: 1.5,
    very_important: 2.0,
  };
  return map[tag] ?? 1.0;
}
