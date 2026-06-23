import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: eventData } = await adminClient
    .from('competition_events')
    .select('status')
    .eq('id', eventId)
    .eq('competition_id', id)
    .single();

  if (!eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (eventData.status !== 'active') {
    return NextResponse.json({ error: 'Only active events can be stopped' }, { status: 409 });
  }

  // Delete any unconfirmed results so the event is clean when restarted
  await adminClient
    .from('results')
    .delete()
    .eq('competition_event_id', eventId)
    .is('confirmed_at', null);

  const { error } = await adminClient
    .from('competition_events')
    .update({ status: 'pending', started_at: null })
    .eq('id', eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { stopped: true } });
}
