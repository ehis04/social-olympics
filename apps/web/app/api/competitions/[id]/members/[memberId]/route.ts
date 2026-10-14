/*
 * This file handles requests for the memberId API route.
 */

// PATCH /api/competitions/[id]/members/[memberId] — change a member's role.
// DELETE — leave the competition (self) or remove a member (host/co-host).
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Params {
  params: Promise<{ id: string; memberId: string }>;
}

const ROLES: MemberRole[] = ['competitor', 'spectator', 'cohost'];

// Handles patch.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, memberId } = await params;
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  const isHost = competition.host_id === user.id;
  const isHostOrCohost = isHost || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Members can no longer be changed.' }, { status: 409 });
  }

  let body: { role?: MemberRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'role must be competitor, spectator or cohost' }, { status: 400 });
  }

  const { data: target } = await adminClient
    .from('competition_members')
    .select('id, profile_id, status')
    .eq('id', memberId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  if (target.status === 'withdrawn') {
    return NextResponse.json({ error: 'This member has left the competition' }, { status: 409 });
  }

  if (target.profile_id === competition.host_id) {
    return NextResponse.json({ error: "The host's role cannot be changed" }, { status: 400 });
  }

  const isTargetCohost = competition.cohost_id === target.profile_id;
  const changesCohost = body.role === 'cohost' || isTargetCohost;
  if (changesCohost && !isHost) {
    return NextResponse.json({ error: 'Only the host can appoint or change the co-host' }, { status: 403 });
  }

  // The co-host is stored on the competition so it keeps its permissions everywhere.
  // They stay a competitor so their results and votes still count.
  const memberRole: MemberRole = body.role === 'cohost' ? 'competitor' : body.role;
  const { error: roleError } = await adminClient
    .from('competition_members')
    .update({ role: memberRole })
    .eq('id', memberId);
  if (roleError) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });

  if (body.role === 'cohost' && !isTargetCohost) {
    const { error } = await adminClient.from('competitions').update({ cohost_id: target.profile_id }).eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed to appoint co-host' }, { status: 500 });
  } else if (body.role !== 'cohost' && isTargetCohost) {
    const { error } = await adminClient.from('competitions').update({ cohost_id: null }).eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed to remove co-host' }, { status: 500 });
  }

  return NextResponse.json({ data: { success: true } });
}

// Handles delete.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, memberId } = await params;
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  const { data: targetMember } = await adminClient
    .from('competition_members')
    .select('id, profile_id, status')
    .eq('id', memberId)
    .eq('competition_id', id)
    .maybeSingle();

  if (!targetMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const isHostOrCohost =
    competition.host_id === user.id || competition.cohost_id === user.id;
  const isSelf = targetMember.profile_id === user.id;

  if (!isSelf && !isHostOrCohost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (targetMember.profile_id === competition.host_id) {
    return NextResponse.json({ error: 'The host cannot be removed' }, { status: 400 });
  }

  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Members can no longer be changed.' }, { status: 409 });
  }

  // Members cannot update their own membership row under RLS, so the change is made
  // with the service client after the permission checks above.
  const { error } = await adminClient
    .from('competition_members')
    .update({ status: 'withdrawn' })
    .eq('id', memberId);

  if (error) return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });

  if (competition.cohost_id === targetMember.profile_id) {
    await adminClient.from('competitions').update({ cohost_id: null }).eq('id', id);
  }

  return NextResponse.json({ data: { success: true } });
}
