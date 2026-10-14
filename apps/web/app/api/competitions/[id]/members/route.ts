/*
 * This file handles requests for the members API route.
 */

// GET and POST /api/competitions/[id]/members — list members or add a member
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { addMember, createAdminClient, getCompetition, getCompetitionMembers } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Params {
  params: Promise<{ id: string }>;
}

// Handles get.
export async function GET(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Verify caller is a member
  const { data: member } = await client
    .from('competition_members')
    .select('id')
    .eq('competition_id', (await params).id)
    .eq('profile_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await getCompetitionMembers(client, (await params).id);
  if (error) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  return NextResponse.json({ data });
}

// Handles post.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition has finished and is closed to new members.' }, { status: 409 });
  }

  let body: { profile_id?: string; role?: MemberRole } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is valid for self-join
  }

  const isHostOrCohost =
    competition.host_id === user.id || competition.cohost_id === user.id;
  const targetProfileId = body.profile_id && body.profile_id !== user.id ? body.profile_id : user.id;
  const isHostAdding = targetProfileId !== user.id;

  if (isHostAdding && !isHostOrCohost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existing } = await adminClient
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', id)
    .eq('profile_id', targetProfileId)
    .maybeSingle();

  // Self-join without an invite is only possible for public competitions.
  // Invited members of private competitions accept their invitation here.
  if (!isHostAdding && !competition.is_public && existing?.status !== 'invited') {
    return NextResponse.json(
      { error: 'This competition is private. Use an invite code to join.' },
      { status: 403 },
    );
  }

  if (existing) {
    if (existing.status === 'active') {
      return NextResponse.json({ data: { success: true, competitionId: id, alreadyMember: true } });
    }
    // Former or invited members are re-activated rather than duplicated.
    const { error: updateError } = await adminClient
      .from('competition_members')
      .update({ status: 'active', joined_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (updateError) return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });
    return NextResponse.json({ data: { success: true, competitionId: id } });
  }

  const role: MemberRole = isHostAdding && body.role === 'spectator' ? 'spectator' : 'competitor';
  const { data: member, error } = await addMember(adminClient, id, targetProfileId, role);
  if (error) return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });

  return NextResponse.json(
    { data: { success: true, competitionId: id, role: (member as { role?: string } | null)?.role ?? role } },
    { status: 201 },
  );
}
