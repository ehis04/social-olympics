// supabase/functions/calculate_scores/index.ts
// Recalculates all member scores for a competition after a result confirmation or weight change.

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestBody {
  competition_id: string;
}

interface MemberRow {
  profile_id: string;
}

interface ScoreRow {
  profile_id: string;
  total_points: number;
  total_participation_points: number;
  events_entered: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    const user = await getAuthenticatedUser(req, userClient);
    const admin = createAdminClient();

    const body: RequestBody = await req.json();
    if (!body.competition_id) {
      return new Response(JSON.stringify({ success: false, error: 'competition_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is host or cohost
    const { data: comp } = await admin
      .from('competitions')
      .select('host_id, cohost_id')
      .eq('id', body.competition_id)
      .single();

    if (!comp) {
      return new Response(JSON.stringify({ success: false, error: 'Competition not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const c = comp as { host_id: string; cohost_id: string | null };
    if (c.host_id !== user.profileId && c.cohost_id !== user.profileId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all active members
    const { data: members, error: membersError } = await admin
      .from('competition_members')
      .select('profile_id')
      .eq('competition_id', body.competition_id)
      .eq('status', 'active');

    if (membersError) throw new Error(membersError.message);

    const memberList = (members ?? []) as MemberRow[];

    // For each member, aggregate their confirmed results for this competition
    const scores: ScoreRow[] = await Promise.all(
      memberList.map(async ({ profile_id }) => {
        const { data: results } = await admin
          .from('results')
          .select('points_awarded, participation_points, finishing_place')
          .eq('profile_id', profile_id)
          .not('confirmed_at', 'is', null)
          .in(
            'competition_event_id',
            (
              await admin
                .from('competition_events')
                .select('id')
                .eq('competition_id', body.competition_id)
            ).data?.map((e: { id: string }) => e.id) ?? [],
          );

        const rows = (results ?? []) as Array<{
          points_awarded: number | null;
          participation_points: number | null;
          finishing_place: number | null;
        }>;

        const total_points = rows.reduce((s, r) => s + (r.points_awarded ?? 0), 0);
        const total_participation_points = rows.reduce((s, r) => s + (r.participation_points ?? 0), 0);
        const events_entered = rows.length;
        const gold_medals = rows.filter((r) => r.finishing_place === 1).length;
        const silver_medals = rows.filter((r) => r.finishing_place === 2).length;
        const bronze_medals = rows.filter((r) => r.finishing_place === 3).length;

        return { profile_id, total_points, total_participation_points, events_entered, gold_medals, silver_medals, bronze_medals };
      }),
    );

    // Bulk upsert scores into competition_members
    await Promise.all(
      scores.map((s) =>
        admin
          .from('competition_members')
          .update({
            total_points: s.total_points,
            participation_points: s.total_participation_points,
            events_entered: s.events_entered,
            gold_medals: s.gold_medals,
            silver_medals: s.silver_medals,
            bronze_medals: s.bronze_medals,
          })
          .eq('competition_id', body.competition_id)
          .eq('profile_id', s.profile_id),
      ),
    );

    const response: ApiResponse<{ updated: number }> = {
      success: true,
      data: { updated: scores.length },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
