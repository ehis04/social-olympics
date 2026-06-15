// supabase/functions/generate-podium/index.ts
// Finalises a competition: assigns final ranks, marks complete, posts feed entry, notifies members.

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

interface MemberScore {
  profile_id: string;
  total_points: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  display_name: string | null;
  avatar_url: string | null;
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
      return new Response(
        JSON.stringify({ success: false, error: 'competition_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Verify caller is host only (not cohost — podium is a host-only action)
    const { data: comp } = await admin
      .from('competitions')
      .select('host_id, status, name')
      .eq('id', body.competition_id)
      .single();

    const c = comp as { host_id: string; status: string; name: string } | null;
    if (!c) {
      return new Response(JSON.stringify({ success: false, error: 'Competition not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (c.host_id !== user.profileId) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (c.status === 'complete') {
      return new Response(
        JSON.stringify({ success: false, error: 'Competition is already complete' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch all active members with scores and profile data
    const { data: membersData, error: membersError } = await admin
      .from('competition_members')
      .select('profile_id, total_points, gold_medals, silver_medals, bronze_medals, profiles(display_name, avatar_url)')
      .eq('competition_id', body.competition_id)
      .eq('status', 'active')
      .order('total_points', { ascending: false });

    if (membersError) throw new Error(membersError.message);

    const members = (membersData ?? []) as Array<{
      profile_id: string;
      total_points: number;
      gold_medals: number;
      silver_medals: number;
      bronze_medals: number;
      profiles: { display_name: string | null; avatar_url: string | null } | null;
    }>;

    // Assign final ranks — shared place for tied scores (by points, then gold, silver, bronze)
    let currentRank = 1;
    const ranked: (MemberScore & { final_rank: number })[] = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i]!;
      const prev = members[i - 1];

      const isTied = prev != null &&
        m.total_points === prev.total_points &&
        m.gold_medals === prev.gold_medals &&
        m.silver_medals === prev.silver_medals &&
        m.bronze_medals === prev.bronze_medals;

      if (!isTied && i > 0) currentRank = i + 1;

      ranked.push({
        profile_id: m.profile_id,
        total_points: m.total_points,
        gold_medals: m.gold_medals,
        silver_medals: m.silver_medals,
        bronze_medals: m.bronze_medals,
        display_name: m.profiles?.display_name ?? null,
        avatar_url: m.profiles?.avatar_url ?? null,
        final_rank: currentRank,
      });
    }

    // Write final_rank to competition_members
    await Promise.all(
      ranked.map((r) =>
        admin
          .from('competition_members')
          .update({ final_rank: r.final_rank })
          .eq('competition_id', body.competition_id)
          .eq('profile_id', r.profile_id),
      ),
    );

    // Mark competition complete
    await admin
      .from('competitions')
      .update({ status: 'complete', completed_at: new Date().toISOString() })
      .eq('id', body.competition_id);

    // Build podium top 3
    const podium = ranked.filter((r) => r.final_rank <= 3).map((r) => ({
      rank: r.final_rank,
      profile_id: r.profile_id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      total_points: r.total_points,
    }));

    // Insert feed entry
    await admin.from('activity_feed').insert({
      competition_id: body.competition_id,
      event_type: 'podium_generated',
      actor_profile_id: user.profileId,
      metadata: { podium, competition_name: c.name },
    });

    // Notify all members
    const memberProfileIds = ranked.map((r) => r.profile_id);
    const winner = podium[0];

    if (memberProfileIds.length > 0) {
      const notifRows = memberProfileIds.map((profile_id) => ({
        profile_id,
        type: 'competition_complete',
        title: `${c.name} is complete!`,
        body: winner
          ? `🥇 ${winner.display_name ?? 'Someone'} won with ${winner.total_points} points`
          : 'The competition has ended',
        data: { competition_id: body.competition_id },
        read: false,
      }));
      await admin.from('notifications').insert(notifRows);
    }

    const response: ApiResponse<{ podium: typeof podium; total_members: number }> = {
      success: true,
      data: { podium, total_members: ranked.length },
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
