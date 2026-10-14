/*
 * This file handles requests for the complete API route.
 */

// POST /api/competitions/[id]/complete — mark competition complete and assign final ranks
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, completeCompetition } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { finaliseEventAwards } from '@/lib/scoring/awards';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: Promise<{ id: string }>;
}

// Handles post.
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await client
    .from('competitions')
    .select('host_id, status')
    .eq('id', id)
    .single();

  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = compData as Pick<CompetitionRow, 'host_id' | 'status'>;

  if (competition.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can complete a competition' }, { status: 403 });
  }

  if (competition.status === 'complete' || competition.status === 'archived') {
    return NextResponse.json({ error: 'Competition is already finished' }, { status: 409 });
  }

  const adminClient = createAdminClient();
  const { data: events, error: eventsError } = await adminClient.from('competition_events')
    .select('id, status, name_override, events(name)').eq('competition_id', id);
  if (eventsError) return NextResponse.json({ error: 'Failed to check competition events' }, { status: 500 });
  const unfinished = (events ?? []).filter((event) => ['pending', 'active', 'results_pending'].includes(event.status));
  if (!events?.some((event) => event.status === 'confirmed') || unfinished.length > 0) {
    return NextResponse.json({ error: 'Confirm all event results or cancel unfinished events before completing the competition.' }, { status: 409 });
  }
  if (events.some((event) => event.status === 'disputed')) {
    return NextResponse.json({ error: 'Resolve the open disputes before completing the competition.' }, { status: 409 });
  }
  const { count: unresolvedTies, error: tiesError } = await adminClient.from('tiebreakers')
    .select('id', { count: 'exact', head: true }).eq('competition_id', id).neq('status', 'resolved');
  if (tiesError) return NextResponse.json({ error: 'Failed to check tiebreakers' }, { status: 500 });
  if (unresolvedTies) return NextResponse.json({ error: 'Resolve outstanding tiebreakers before completing the competition.' }, { status: 409 });

  // Awards still open are settled now so their bonus points count in the final standings.
  const { data: fullCompetition } = await adminClient
    .from('competitions')
    .select('id, name, mvp_voting_enabled, worst_performer_enabled')
    .eq('id', id)
    .single();
  if (fullCompetition && (fullCompetition.mvp_voting_enabled || fullCompetition.worst_performer_enabled)) {
    for (const event of events.filter((row) => row.status === 'confirmed')) {
      const eventName = event.name_override ?? (event.events as unknown as { name: string } | null)?.name ?? 'Event';
      await finaliseEventAwards(adminClient, fullCompetition, event.id, eventName);
    }
  }

  const { data: resolvedTies } = await adminClient
    .from('tiebreakers')
    .select('profile_id_a, profile_id_b, winner_profile_id')
    .eq('competition_id', id)
    .eq('status', 'resolved')
    .not('winner_profile_id', 'is', null);
  const tiebreakers = (resolvedTies ?? []).map((tie) => ({
    winner: tie.winner_profile_id as string,
    loser: (tie.winner_profile_id === tie.profile_id_a ? tie.profile_id_b : tie.profile_id_a) as string,
  }));

  const { data, error } = await completeCompetition(adminClient, id, { tiebreakers });
  if (error) return NextResponse.json({ error: 'Failed to complete competition' }, { status: 500 });

  const { data: members } = await adminClient
    .from('competition_members')
    .select('profile_id, final_rank')
    .eq('competition_id', id)
    .eq('status', 'active');
  const competitionName = fullCompetition?.name ?? 'Your competition';
  await createNotifications(
    adminClient,
    (members ?? []).map((member) => ({
      profileId: member.profile_id,
      type: 'competition_completed',
      title: 'Your final results are ready',
      body: member.final_rank
        ? `${competitionName} is complete. You finished in place ${member.final_rank}. See the podium!`
        : `${competitionName} is complete. See the podium!`,
      data: { competition_id: id, href: `/competitions/${id}/podium` },
    })),
  );
  await adminClient.from('activity_feed').insert({
    competition_id: id,
    event_type: 'competition_completed',
    actor_profile_id: user.id,
    metadata: { competition_name: competitionName },
  });

  return NextResponse.json({ data });
}
