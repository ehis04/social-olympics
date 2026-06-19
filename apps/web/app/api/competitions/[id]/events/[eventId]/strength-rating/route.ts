// POST /api/competitions/[id]/events/[eventId]/strength-rating — competitor submits self-declared strength rating
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

interface Params {
  params: { id: string; eventId: string };
}

interface RequestBody {
  self_rating: number;
}

interface TeamMemberRow {
  id: string;
  profile_id: string;
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { self_rating } = body;
  if (typeof self_rating !== 'number' || self_rating < 1 || self_rating > 10) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'self_rating must be a number between 1 and 10' } }, { status: 400 });
  }

  // Find the team_member row for this user in this event
  const { data: teamMemberData, error: tmError } = await client
    .from('team_members')
    .select('id, profile_id, teams!inner(competition_event_id)')
    .eq('profile_id', user.id)
    .eq('teams.competition_event_id', params.eventId)
    .single();

  if (tmError || !teamMemberData) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Team member record not found for this event' } }, { status: 404 });
  }

  const teamMember = teamMemberData as TeamMemberRow;

  const { data, error } = await client
    .from('team_members')
    .update({
      strength_rating: self_rating,
      rating_source: 'peer_voted',
    })
    .eq('id', teamMember.id)
    .select()
    .single();

  if (error) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
