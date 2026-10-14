/*
 * This file handles requests for the join API route.
 */

// POST /api/competitions/join — join a competition using an 8-character invite code
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionByInviteCode, addMember, createAdminClient } from '@repo/supabase';
import { JoinByCodeSchema } from '@repo/validations';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

// Handles post.
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = JoinByCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid invite code' },
      { status: 400 },
    );
  }

  // Private competitions are intentionally hidden by RLS until membership is
  // granted. Validate the invitation using a server-only client first.
  const adminClient = createAdminClient();
  const { data: compData } = await getCompetitionByInviteCode(adminClient, parsed.data.invite_code);
  if (!compData) {
    return NextResponse.json(
      { error: 'Invalid invite code. Please check and try again.' },
      { status: 404 },
    );
  }

  const competition = compData as CompetitionRow;

  if (['archived', 'complete'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is closed to new members.' }, { status: 400 });
  }

  // Check not already a member
  const { data: existing } = await adminClient
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', competition.id)
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ data: { competitionId: competition.id, alreadyMember: true } });
    }
    // Invited or former members accept the invitation by joining with the code.
    const { error: updateError } = await adminClient
      .from('competition_members')
      .update({ status: 'active', joined_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateError) return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });
    return NextResponse.json({ data: { competitionId: competition.id } });
  }

  // Once a competition has started, new members join as spectators (the host can promote them).
  const { data: member, error } = await addMember(adminClient, competition.id, user.id, 'competitor');
  if (error) {
    return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });
  }

  const role = (member as { role?: string } | null)?.role ?? 'competitor';
  return NextResponse.json({ data: { competitionId: competition.id, role } }, { status: 201 });
}
