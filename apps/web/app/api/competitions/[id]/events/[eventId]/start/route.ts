// POST /api/competitions/[id]/events/[eventId]/start — starts a pending event.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, startEvent } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type CompEventRow = Database['public']['Tables']['competition_events']['Row'];

interface RouteParams {
  params: { id: string; eventId: string };
}

export async function POST(_request: Request, { params }: RouteParams) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const allowedCompStatuses = ['setup', 'open', 'active'];
  if (!allowedCompStatuses.includes(competition.status)) {
    return NextResponse.json(
      { error: 'Competition must be in setup, open, or active to start an event' },
      { status: 409 },
    );
  }

  const { data: activeEvents, error: activeError } = await client
    .from('competition_events')
    .select('id')
    .eq('competition_id', params.id)
    .eq('status', 'active');

  if (activeError) return NextResponse.json({ error: activeError.message }, { status: 500 });

  if ((activeEvents ?? []).length > 0) {
    return NextResponse.json(
      { error: 'Another event is currently active. Complete or cancel it before starting a new one.' },
      { status: 409 },
    );
  }

  const { data: eventData } = await client
    .from('competition_events')
    .select('status')
    .eq('id', params.eventId)
    .eq('competition_id', params.id)
    .single();

  const ev = eventData as Pick<CompEventRow, 'status'> | null;
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (ev.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending events can be started' }, { status: 409 });
  }

  const { data, error } = await startEvent(client, params.eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
