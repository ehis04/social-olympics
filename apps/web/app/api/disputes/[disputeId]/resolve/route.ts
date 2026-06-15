// POST /api/disputes/[disputeId]/resolve — host resolves or dismisses a dispute.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, resolveDispute } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: { disputeId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: { action?: 'resolve' | 'dismiss'; competition_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.action || !['resolve', 'dismiss'].includes(body.action)) {
    return NextResponse.json({ error: 'action must be "resolve" or "dismiss"' }, { status: 400 });
  }
  if (!body.competition_id) {
    return NextResponse.json({ error: 'competition_id is required' }, { status: 400 });
  }

  // Verify caller is host or cohost
  const { data: compData, error: compError } = await getCompetition(client, body.competition_id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify dispute exists and is open
  const { data: disputeData } = await client
    .from('result_disputes')
    .select('status')
    .eq('id', params.disputeId)
    .single();

  if (!disputeData) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  if ((disputeData as { status: string }).status !== 'open') {
    return NextResponse.json({ error: 'Dispute is already resolved' }, { status: 409 });
  }

  const { data, error } = await resolveDispute(client, params.disputeId, body.action);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
