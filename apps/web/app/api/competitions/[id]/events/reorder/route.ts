// PATCH /api/competitions/[id]/events/reorder — bulk updates event sequence order.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, reorderEvents } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: { id: string };
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

  let body: { orderedIds?: string[] };
  try {
    body = (await request.json()) as { orderedIds?: string[] };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds must be a non-empty array' }, { status: 400 });
  }

  const { data: existingEvents } = await client
    .from('competition_events')
    .select('id')
    .eq('competition_id', params.id);

  const existingIds = new Set((existingEvents ?? []).map((e: { id: string }) => e.id));
  const allBelong = body.orderedIds.every((id) => existingIds.has(id));
  if (!allBelong) {
    return NextResponse.json({ error: 'One or more event IDs do not belong to this competition' }, { status: 400 });
  }

  const { error } = await reorderEvents(client, body.orderedIds);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: null });
}
