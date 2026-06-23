// GET /api/competitions/[id]/members/[memberId]/events
// Returns events a member is assigned to and events they have results in for a competition.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id: competitionId, memberId: profileId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();

  // Fetch all competition events for this competition
  const { data: compEvents } = await adminClient
    .from('competition_events')
    .select('id, status, scheduled_at, events(name, result_type, event_categories(name))')
    .eq('competition_id', competitionId);

  if (!compEvents || compEvents.length === 0) {
    return NextResponse.json({ data: { assigned: [], results: [] }, error: null });
  }

  const compEventIds = compEvents.map((e) => (e as { id: string }).id);

  // Fetch assignments and results filtered to this competition's events
  const [assignedResult, resultsResult] = await Promise.all([
    adminClient
      .from('competition_event_participants')
      .select('competition_event_id')
      .eq('profile_id', profileId)
      .in('competition_event_id', compEventIds),

    adminClient
      .from('results')
      .select('id, finishing_place, points_awarded, participation_points, result_value_primary, is_dnf, competition_event_id')
      .eq('profile_id', profileId)
      .in('competition_event_id', compEventIds),
  ]);

  // Build lookup map: competition event id → event details
  type CompEvent = {
    id: string;
    status: string;
    scheduled_at: string | null;
    events: { name: string; result_type: string; event_categories: { name: string } | null } | null;
  };
  const eventMap = Object.fromEntries(
    compEvents.map((e) => {
      const ev = e as unknown as CompEvent;
      return [ev.id, ev];
    }),
  );

  const assigned = (assignedResult.data ?? []).map((a) => {
    const row = a as { competition_event_id: string };
    return {
      competition_event_id: row.competition_event_id,
      competition_events: eventMap[row.competition_event_id] ?? null,
    };
  });

  const results = (resultsResult.data ?? []).map((r) => {
    const row = r as unknown as {
      id: string;
      finishing_place: number | null;
      points_awarded: number | null;
      participation_points: number | null;
      result_value_primary: number | null;
      is_dnf: boolean;
      competition_event_id: string;
    };
    return {
      id: row.id,
      finishing_place: row.finishing_place,
      points_awarded: row.points_awarded,
      participation_points: row.participation_points,
      result_value_primary: row.result_value_primary,
      is_dnf: row.is_dnf,
      competition_events: eventMap[row.competition_event_id] ?? null,
    };
  });

  return NextResponse.json({ data: { assigned, results }, error: null });
}
