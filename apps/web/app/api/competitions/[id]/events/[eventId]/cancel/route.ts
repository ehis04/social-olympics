/*
 * This file handles requests for the cancel event API route.
 */

// POST /api/competitions/[id]/events/[eventId]/cancel — host or co-host cancels an unfinished event.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

const CANCELLABLE = ['pending', 'active', 'results_pending'];

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Only the host or co-host can cancel events' }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }

  let body: { reason?: unknown } = {};
  try {
    body = (await request.json()) as { reason?: unknown };
  } catch {
    // A reason is optional.
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 200) : '';

  const { data: event } = await adminClient
    .from('competition_events')
    .select('status, name_override, events(name)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!CANCELLABLE.includes(event.status)) {
    return NextResponse.json(
      { error: 'Only events that have not been confirmed can be cancelled' },
      { status: 409 },
    );
  }

  // Unconfirmed submissions never counted towards scores; remove them with the event.
  await adminClient
    .from('results')
    .delete()
    .eq('competition_event_id', eventId)
    .is('confirmed_at', null);

  const { error } = await adminClient
    .from('competition_events')
    .update({ status: 'cancelled', cancelled_reason: reason || null })
    .eq('id', eventId);
  if (error) return NextResponse.json({ error: 'Failed to cancel event' }, { status: 500 });

  const eventName =
    event.name_override ?? (event.events as unknown as { name: string } | null)?.name ?? 'An event';
  const { data: members } = await adminClient
    .from('competition_members')
    .select('profile_id')
    .eq('competition_id', id)
    .eq('status', 'active')
    .neq('profile_id', user.id);

  await createNotifications(
    adminClient,
    (members ?? []).map((member) => ({
      profileId: member.profile_id,
      type: 'event_cancelled',
      title: 'Event cancelled',
      body: `${eventName} in ${competition.name} was cancelled${reason ? `: ${reason}` : '.'}`,
      data: {
        competition_id: id,
        competition_event_id: eventId,
        href: `/competitions/${id}/events/${eventId}`,
      },
    })),
  );

  return NextResponse.json({ data: { cancelled: true } });
}
