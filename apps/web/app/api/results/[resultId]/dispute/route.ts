// POST /api/results/[resultId]/dispute — competitor raises a dispute against a result.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { raiseDispute } from '@repo/supabase';

interface RouteParams {
  params: { resultId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Verify the result belongs to the caller
  const { data: resultData } = await client
    .from('results')
    .select('profile_id, confirmed_at, competition_event_id')
    .eq('id', params.resultId)
    .single();

  if (!resultData) return NextResponse.json({ error: 'Result not found' }, { status: 404 });

  const result = resultData as { profile_id: string; confirmed_at: string | null; competition_event_id: string };

  if (result.profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!result.confirmed_at) {
    return NextResponse.json({ error: 'Cannot dispute an unconfirmed result' }, { status: 409 });
  }

  // Check dispute window is still open
  const { data: eventData } = await client
    .from('competition_events')
    .select('dispute_window_closes_at, status')
    .eq('id', result.competition_event_id)
    .single();

  const ev = eventData as { dispute_window_closes_at: string | null; status: string } | null;

  if (!ev?.dispute_window_closes_at || new Date(ev.dispute_window_closes_at) <= new Date()) {
    return NextResponse.json({ error: 'The dispute window for this event has closed' }, { status: 409 });
  }

  if (ev.status === 'disputed') {
    return NextResponse.json({ error: 'A dispute is already open for this event' }, { status: 409 });
  }

  let body: { reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.reason?.trim()) {
    return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
  }

  const { data, error } = await raiseDispute(client, {
    result_id: params.resultId,
    raised_by: user.id,
    reason: body.reason.trim(),
    status: 'open',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
