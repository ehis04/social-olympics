// POST /api/competitions/[id]/events/[eventId]/teams — host assigns balanced teams
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition } from '@repo/supabase';
import { balanceTeams } from '@repo/scoring';
import type { PlayerForBalancing } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: { id: string; eventId: string };
}

interface RequestBody {
  team_count: number;
}

interface TeamMemberRow {
  id: string;
  profile_id: string;
  strength_rating: number | null;
  confirmed_at: string | null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Host or co-host only' } }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const teamCount = body.team_count ?? 2;

  // Fetch all team members with confirmed ratings for this event
  const { data: teamMembersData, error: tmError } = await client
    .from('teams')
    .select('team_members(id, profile_id, strength_rating, confirmed_at)')
    .eq('competition_event_id', params.eventId);

  if (tmError) return NextResponse.json({ data: null, error: { code: tmError.code, message: tmError.message } }, { status: 500 });

  const teamMembers = ((teamMembersData ?? []) as Array<{ team_members: TeamMemberRow[] | null }>)
    .flatMap((team) => team.team_members ?? [])
    .filter((member) => member.strength_rating !== null);

  if (teamMembers.length === 0) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'No rated team members found for this event' } }, { status: 400 });
  }

  const players: PlayerForBalancing[] = teamMembers.map((tm) => ({
    profileId: tm.profile_id,
    strengthRating: tm.strength_rating ?? 5,
  }));

  const { teams, withinTolerance } = balanceTeams(players, teamCount);

  // Persist team assignments — create teams rows and update team_members
  const teamInserts = await Promise.all(
    teams.map(async (team, index) => {
      const { data: teamRow, error: teamError } = await client
        .from('teams')
        .insert({
          competition_event_id: params.eventId,
          name: `Team ${String.fromCharCode(65 + index)}`,
        })
        .select()
        .single();

      if (teamError || !teamRow) return { error: teamError };

      const tr = teamRow as { id: string };

      await Promise.all(
        team.players.map((player) =>
          client
            .from('team_members')
            .update({ team_id: tr.id })
            .eq(
              'id',
              teamMembers.find((member) => member.profile_id === player.profileId)?.id ?? '',
            ),
        ),
      );

      return { teamId: tr.id, members: team.players };
    }),
  );

  const hasError = teamInserts.some((t) => 'error' in t && t.error);
  if (hasError) {
    return NextResponse.json({ data: null, error: { code: 'INTERNAL', message: 'Failed to create some teams' } }, { status: 500 });
  }

  return NextResponse.json({ data: { teams: teamInserts, withinTolerance }, error: null });
}
