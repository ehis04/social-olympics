/*
 * This file handles requests for the resolve dispute API route.
 */

// POST /api/disputes/[disputeId]/resolve — host or co-host resolves or dismisses a dispute.
// "resolve" may correct the disputed result; the event is then re-ranked and scores recalculated.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { rerankEvent } from '@/lib/scoring/event-scoring';

interface RouteParams {
  params: Promise<{ disputeId: string }>;
}

const ResolveSchema = z.object({
  action: z.enum(['resolve', 'dismiss']),
  competition_id: z.string().uuid().optional(),
  result_value: z.number().finite().nonnegative().nullable().optional(),
  is_dnf: z.boolean().optional(),
  note: z.string().max(300).optional(),
});

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { disputeId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = ResolveSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'action must be "resolve" or "dismiss"' }, { status: 400 });
  }
  const body = parsed.data;

  const adminClient = createAdminClient();
  const { data: dispute } = await adminClient
    .from('result_disputes')
    .select('id, status, raised_by, result_id, results(id, profile_id, competition_event_id, competition_events(id, competition_id, name_override, events(name), competitions(id, name, host_id, cohost_id, status)))')
    .eq('id', disputeId)
    .maybeSingle();

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });

  const result = dispute.results as unknown as {
    id: string;
    profile_id: string;
    competition_event_id: string;
    competition_events: {
      id: string;
      competition_id: string;
      name_override: string | null;
      events: { name: string } | null;
      competitions: { id: string; name: string; host_id: string; cohost_id: string | null; status: string } | null;
    } | null;
  } | null;
  const event = result?.competition_events;
  const competition = event?.competitions;
  if (!result || !event || !competition) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });

  if (body.competition_id && body.competition_id !== competition.id) {
    return NextResponse.json({ error: 'Dispute does not belong to this competition' }, { status: 400 });
  }
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  if (dispute.status !== 'open') {
    return NextResponse.json({ error: 'Dispute is already resolved' }, { status: 409 });
  }

  const correcting = body.action === 'resolve' && (body.result_value !== undefined || body.is_dnf !== undefined);
  if (correcting) {
    const isDnf = body.is_dnf ?? false;
    if (!isDnf && (body.result_value === undefined || body.result_value === null)) {
      return NextResponse.json({ error: 'Enter the corrected result or mark it as DNF' }, { status: 400 });
    }
    const { error: updateError } = await adminClient
      .from('results')
      .update({
        result_value_primary: isDnf ? null : body.result_value ?? null,
        is_dnf: isDnf,
      })
      .eq('id', result.id);
    if (updateError) return NextResponse.json({ error: 'Failed to correct the result' }, { status: 500 });

    const { error: rankError } = await rerankEvent(adminClient, competition.id, event.id, user.id);
    if (rankError) return NextResponse.json({ error: rankError }, { status: 500 });
  }

  const { data: updated, error } = await adminClient
    .from('result_disputes')
    .update({
      status: body.action === 'resolve' ? 'resolved' : 'dismissed',
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The event returns to confirmed once no other disputes on it remain open.
  const { data: eventResults } = await adminClient
    .from('results')
    .select('id')
    .eq('competition_event_id', event.id);
  const { count: stillOpen } = await adminClient
    .from('result_disputes')
    .select('id', { count: 'exact', head: true })
    .in('result_id', (eventResults ?? []).map((row) => row.id))
    .eq('status', 'open');
  if ((stillOpen ?? 0) === 0) {
    await adminClient.from('competition_events').update({ status: 'confirmed' }).eq('id', event.id);
  }

  const eventName = event.name_override ?? event.events?.name ?? 'your event';
  const outcome = body.action === 'dismiss'
    ? 'was dismissed: the result stands'
    : correcting
      ? 'was upheld and your result was corrected'
      : 'was resolved';
  await createNotifications(adminClient, [{
    profileId: dispute.raised_by,
    type: 'dispute_resolved',
    title: body.action === 'dismiss' ? 'Dispute dismissed' : 'Dispute resolved',
    body: `Your dispute in ${eventName} ${outcome}.${body.note ? ` Host note: ${body.note}` : ''}`,
    data: {
      competition_id: competition.id,
      competition_event_id: event.id,
      href: `/competitions/${competition.id}/events/${event.id}`,
    },
  }]);

  await adminClient.from('activity_feed').insert({
    competition_id: competition.id,
    event_type: 'dispute_resolved',
    actor_profile_id: user.id,
    subject_profile_id: dispute.raised_by,
    competition_event_id: event.id,
    result_id: result.id,
    metadata: { event_name: eventName, outcome: body.action },
  });

  return NextResponse.json({ data: updated });
}
