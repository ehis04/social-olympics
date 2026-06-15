// POST /api/competitions/[id]/results — competitor submits a result for an active event.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, submitResult } from '@repo/supabase';
import { canSubmitResult } from '@/utils/helpers/results';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface RouteParams {
  params: { id: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;

  // Fetch caller's membership and role
  const { data: memberData } = await client
    .from('competition_members')
    .select('role')
    .eq('competition_id', params.id)
    .eq('profile_id', user.id)
    .single();

  if (!memberData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const memberRole = (memberData as { role: MemberRole }).role;

  let body: { competition_event_id?: string; result_value?: number; notes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.competition_event_id) {
    return NextResponse.json({ error: 'competition_event_id is required' }, { status: 400 });
  }
  if (body.result_value == null) {
    return NextResponse.json({ error: 'result_value is required' }, { status: 400 });
  }

  // Verify the event belongs to this competition and is active
  const { data: eventData } = await client
    .from('competition_events')
    .select('status')
    .eq('id', body.competition_event_id)
    .eq('competition_id', params.id)
    .single();

  if (!eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const eventStatus = (eventData as { status: string }).status;
  if (!canSubmitResult(memberRole, eventStatus)) {
    return NextResponse.json(
      { error: 'Results cannot be submitted for this event at this time' },
      { status: 409 },
    );
  }

  // Prevent duplicate submissions
  const { data: existing } = await client
    .from('results')
    .select('id')
    .eq('competition_event_id', body.competition_event_id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already submitted a result for this event' }, { status: 409 });
  }

  const payload: Record<string, unknown> = {
    competition_event_id: body.competition_event_id,
    profile_id: user.id,
    result_value: body.result_value,
    ...(body.notes && { notes: body.notes }),
  };

  const { data, error } = await submitResult(client, payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Move event to results_pending if not already
  if (eventStatus === 'active') {
    await client
      .from('competition_events')
      .update({ status: 'results_pending' })
      .eq('id', body.competition_event_id)
      .eq('status', 'active');
  }

  return NextResponse.json({ data }, { status: 201 });
}
