// POST /api/competitions/[id]/events/[eventId]/strength-vote — member votes on a peer strength rating
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { submitStrengthVote } from '@repo/supabase';

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

interface RequestBody {
  team_member_id: string;
  vote: 'confirm' | 'reject';
  submission_round: 1 | 2;
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  // Verify user is a member of this competition
  const { data: memberData } = await client
    .from('competition_members')
    .select('id')
    .eq('competition_id', (await params).id)
    .eq('profile_id', user.id)
    .single();

  if (!memberData) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Not a member of this competition' } }, { status: 403 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { team_member_id, vote, submission_round } = body;
  if (!team_member_id || !vote || !submission_round) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'team_member_id, vote, and submission_round are required' } }, { status: 400 });
  }

  if (vote !== 'confirm' && vote !== 'reject') {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'vote must be confirm or reject' } }, { status: 400 });
  }

  const { data, error } = await submitStrengthVote(client, {
    team_member_id,
    voter_profile_id: user.id,
    vote_type: vote,
    submission_round,
  });

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
