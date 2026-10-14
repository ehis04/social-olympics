/*
 * This file handles requests for the results API route.
 */

// POST /api/competitions/[id]/results — competitor submits a result for an active event.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { ResultSubmissionSchema } from '@/lib/results/submit-schema';
import { createAdminClient, getCompetition, submitResult } from '@repo/supabase';
import { canSubmitResult } from '@/utils/helpers/results';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }

  // Fetch caller's membership and role
  const { data: memberData } = await adminClient
    .from('competition_members')
    .select('role')
    .eq('competition_id', id)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .single();

  if (!memberData) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const memberRole = (memberData as { role: MemberRole }).role;

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = ResultSubmissionSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid result' }, { status: 400 });
  const body = parsed.data;

  // Verify the event belongs to this competition and is active
  const { data: eventData } = await adminClient
    .from('competition_events')
    .select('status')
    .eq('id', body.competition_event_id)
    .eq('competition_id', id)
    .single();

  if (!eventData) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const eventStatus = (eventData as { status: string }).status;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost && !canSubmitResult(memberRole, eventStatus)) {
    return NextResponse.json(
      { error: 'Results cannot be submitted for this event at this time' },
      { status: 409 },
    );
  }

  if (isHostOrCohost && !['active', 'results_pending'].includes(eventStatus)) {
    return NextResponse.json(
      { error: 'Start the event before entering participant results' },
      { status: 409 },
    );
  }

  const resultProfileId = isHostOrCohost ? (body.profile_id ?? user.id) : user.id;
  const { data: resultMember } = await adminClient
    .from('competition_members')
    .select('id')
    .eq('competition_id', id)
    .eq('profile_id', resultProfileId)
    .eq('status', 'active')
    .single();

  if (!resultMember) {
    return NextResponse.json({ error: 'Selected participant is not an active member' }, { status: 400 });
  }

  // Prevent duplicate submissions
  const { data: existing } = await adminClient
    .from('results')
    .select('id')
    .eq('competition_event_id', body.competition_event_id)
    .eq('profile_id', resultProfileId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You have already submitted a result for this event' }, { status: 409 });
  }

  const payload: Record<string, unknown> = {
    competition_event_id: body.competition_event_id,
    profile_id: resultProfileId,
    submitted_by: user.id,
    result_value_primary: body.result_value,
    is_dnf: body.is_dnf,
    ...(body.evidence_url && { evidence_url: body.evidence_url }),
    ...(body.notes && { notes: body.notes }),
  };

  const { data, error } = await submitResult(adminClient, payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Move event to results_pending if not already
  if (eventStatus === 'active') {
    await adminClient
      .from('competition_events')
      .update({ status: 'results_pending' })
      .eq('id', body.competition_event_id)
      .eq('status', 'active');
  }

  return NextResponse.json({ data }, { status: 201 });
}
