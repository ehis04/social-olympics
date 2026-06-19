// PATCH and DELETE /api/competitions/[id]/members/[memberId] — update role or remove member
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, updateMemberRole } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Params {
  params: { id: string; memberId: string };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  const isHostOrCohost =
    competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { role?: MemberRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  const { error } = await updateMemberRole(client, params.memberId, body.role);
  if (error) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  // Fetch the target member to resolve their profile_id
  const { data: targetMember } = await client
    .from('competition_members')
    .select('id, profile_id')
    .eq('id', params.memberId)
    .eq('competition_id', params.id)
    .single();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const isHostOrCohost =
    competition.host_id === user.id || competition.cohost_id === user.id;
  const isSelf = targetMember.profile_id === user.id;

  // Self-removal (leave) or host/cohost removing someone else
  if (!isSelf && !isHostOrCohost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Host cannot remove themselves
  if (targetMember.profile_id === competition.host_id) {
    return NextResponse.json({ error: 'The host cannot be removed' }, { status: 400 });
  }

  const { error } = await client
    .from('competition_members')
    .update({ status: 'withdrawn' })
    .eq('id', params.memberId);

  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
