// POST /api/competitions/[id]/events/[eventId]/vote — submit MVP or worst performer vote
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, submitPerformanceVote } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

interface RequestBody {
  voted_for_profile_id: string;
  vote_type: 'mvp' | 'worst_performer';
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, (await params).id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { voted_for_profile_id, vote_type } = body;
  if (!voted_for_profile_id || !vote_type) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'voted_for_profile_id and vote_type are required' } }, { status: 400 });
  }

  if (vote_type !== 'mvp' && vote_type !== 'worst_performer') {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'vote_type must be mvp or worst_performer' } }, { status: 400 });
  }

  // Prevent self-voting for MVP and worst performer
  if (voted_for_profile_id === user.id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Cannot vote for yourself' } }, { status: 400 });
  }

  // Check voting is enabled for this vote type
  if (vote_type === 'mvp' && !competition.mvp_voting_enabled) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'MVP voting is not enabled for this competition' } }, { status: 400 });
  }
  if (vote_type === 'worst_performer' && !competition.worst_performer_enabled) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Worst performer voting is not enabled for this competition' } }, { status: 400 });
  }

  const { data, error } = await submitPerformanceVote(client, {
    voter_profile_id: user.id,
    voted_for_profile_id,
    competition_event_id: (await params).eventId,
    vote_type,
  });

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
