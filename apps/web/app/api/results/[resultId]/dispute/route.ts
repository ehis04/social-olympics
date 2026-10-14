/*
 * This file handles requests for the dispute API route.
 */

// POST /api/results/[resultId]/dispute — competitor raises a dispute against their confirmed result.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';

interface RouteParams {
  params: Promise<{ resultId: string }>;
}

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { resultId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: { reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const reason = body.reason?.trim() ?? '';
  if (!reason) {
    return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: 'Keep the reason under 500 characters' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: result } = await adminClient
    .from('results')
    .select('id, profile_id, confirmed_at, competition_event_id, competition_events(id, status, dispute_window_closes_at, competition_id, name_override, events(name), competitions(id, name, host_id, cohost_id, status))')
    .eq('id', resultId)
    .maybeSingle();

  if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 });
  if (result.profile_id !== user.id) {
    return NextResponse.json({ error: 'You can only dispute your own result' }, { status: 403 });
  }
  if (!result.confirmed_at) {
    return NextResponse.json({ error: 'Cannot dispute an unconfirmed result' }, { status: 409 });
  }

  const event = result.competition_events as unknown as {
    id: string;
    status: string;
    dispute_window_closes_at: string | null;
    competition_id: string;
    name_override: string | null;
    events: { name: string } | null;
    competitions: { id: string; name: string; host_id: string; cohost_id: string | null; status: string } | null;
  } | null;
  if (!event?.competitions) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const competition = event.competitions;

  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  if (!event.dispute_window_closes_at || new Date(event.dispute_window_closes_at) <= new Date()) {
    return NextResponse.json({ error: 'The dispute window for this event has closed' }, { status: 409 });
  }

  const { count: openForResult } = await adminClient
    .from('result_disputes')
    .select('id', { count: 'exact', head: true })
    .eq('result_id', resultId)
    .eq('status', 'open');
  if ((openForResult ?? 0) > 0) {
    return NextResponse.json({ error: 'You already have an open dispute for this result' }, { status: 409 });
  }

  const { data: dispute, error } = await adminClient
    .from('result_disputes')
    .insert({ result_id: resultId, raised_by: user.id, reason, status: 'open' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Members cannot change event status under RLS, so the service client marks the event disputed.
  await adminClient.from('competition_events').update({ status: 'disputed' }).eq('id', event.id);

  const { data: raiser } = await adminClient.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  const eventName = event.name_override ?? event.events?.name ?? 'an event';
  const hostIds = [competition.host_id, competition.cohost_id].filter(
    (profileId): profileId is string => !!profileId && profileId !== user.id,
  );
  await createNotifications(
    adminClient,
    hostIds.map((profileId) => ({
      profileId,
      type: 'dispute_raised',
      title: 'Result disputed',
      body: `${raiser?.display_name ?? 'A competitor'} disputed their result in ${eventName}: “${reason.slice(0, 120)}”`,
      data: {
        competition_id: competition.id,
        competition_event_id: event.id,
        href: `/competitions/${competition.id}/events/${event.id}`,
      },
    })),
  );

  return NextResponse.json({ data: dispute }, { status: 201 });
}
