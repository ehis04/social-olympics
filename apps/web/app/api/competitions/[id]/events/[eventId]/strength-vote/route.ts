/*
 * This file handles requests for the strength-vote API route.
 */

// POST /api/competitions/[id]/events/[eventId]/strength-vote — member votes on a peer strength rating
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { submitStrengthVote, createAdminClient } from '@repo/supabase';

interface Params {
  params: Promise<{ id: string; eventId: string }>;
}

interface RequestBody {
  team_member_id?: string;
  vote?: 'confirm' | 'reject';
}

// Handles post.
export async function POST(request: NextRequest, { params }: Params) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: memberData } = await adminClient
    .from('competition_members')
    .select('id')
    .eq('competition_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .eq('role', 'competitor')
    .maybeSingle();
  if (!memberData) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Only competitors in this competition can vote on ratings' } }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { team_member_id, vote } = body;
  if (!team_member_id || (vote !== 'confirm' && vote !== 'reject')) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'team_member_id and a confirm or reject vote are required' } }, { status: 400 });
  }

  const { data: target } = await adminClient
    .from('team_members')
    .select('id, profile_id, confirmed_at, teams!inner(competition_event_id, competition_events!inner(competition_id, status))')
    .eq('id', team_member_id)
    .eq('teams.competition_event_id', eventId)
    .eq('teams.competition_events.competition_id', id)
    .maybeSingle();
  if (!target || target.profile_id === user.id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Select another player in this event' } }, { status: 400 });
  }
  const eventStatus = (target.teams as unknown as { competition_events: { status: string } }).competition_events.status;
  if (!['active', 'results_pending'].includes(eventStatus)) {
    return NextResponse.json({ data: null, error: { code: 'VOTING_CLOSED', message: 'Rating votes close when the event ends' } }, { status: 409 });
  }
  if (target.confirmed_at) {
    return NextResponse.json({ data: null, error: { code: 'ALREADY_CONFIRMED', message: 'This rating is already settled' } }, { status: 409 });
  }

  // A second round opens once a majority rejects the first-round rating.
  const { count: competitorCount } = await adminClient
    .from('competition_members')
    .select('id', { count: 'exact', head: true })
    .eq('competition_id', id)
    .eq('status', 'active')
    .eq('role', 'competitor');
  const majority = Math.floor(Math.max(0, (competitorCount ?? 0) - 1) / 2) + 1;
  const { count: roundOneRejects } = await adminClient
    .from('strength_rating_votes')
    .select('id', { count: 'exact', head: true })
    .eq('team_member_id', team_member_id)
    .eq('submission_round', 1)
    .eq('vote', 'reject');
  const submissionRound: 1 | 2 = (roundOneRejects ?? 0) >= majority ? 2 : 1;

  const { data, error } = await submitStrengthVote(adminClient, {
    team_member_id,
    voter_profile_id: user.id,
    vote,
    submission_round: submissionRound,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ data: null, error: { code: 'ALREADY_VOTED', message: 'You have already voted on this rating' } }, { status: 409 });
    }
    return NextResponse.json({ data: null, error }, { status: 500 });
  }
  return NextResponse.json({ data, error: null });
}
