// POST /api/competitions/[id]/events/[eventId]/start — starts a pending event.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition, startEvent } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type CompEventRow = Database['public']['Tables']['competition_events']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, id);
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
    .eq('competition_id', id)
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
    .select('status, events(name)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .single();

  const ev = eventData as (Pick<CompEventRow, 'status'> & {
    events: { name: string } | null;
  }) | null;
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (ev.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending events can be started' }, { status: 409 });
  }

  const { data, error } = await startEvent(client, eventId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adminClient = createAdminClient();
  const { count: existingFeedCount } = await adminClient
    .from('activity_feed')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', id)
    .eq('event_type', 'event_started')
    .eq('competition_event_id', eventId);

  if ((existingFeedCount ?? 0) === 0) {
    await adminClient.from('activity_feed').insert({
      competition_id: id,
      event_type: 'event_started',
      actor_profile_id: user.id,
      competition_event_id: eventId,
      metadata: {
        event_name: ev.events?.name ?? 'Event',
        competition_event_id: eventId,
      },
    });
  }

  const { data: members } = await adminClient
    .from('competition_members')
    .select('profile_id')
    .eq('competition_id', id)
    .eq('status', 'active');

  const eventName = ev.events?.name ?? 'An event';
  await createNotifications(
    adminClient,
    (members ?? []).map((member) => ({
      profileId: member.profile_id,
      type: 'event_started',
      title: 'Event started',
      body: `${eventName} has started in ${competition.name}.`,
      data: {
        competition_id: id,
        competition_event_id: eventId,
        href: `/competitions/${id}/events/${eventId}`,
      },
    })),
  );

  return NextResponse.json({ data });
}
