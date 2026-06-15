// supabase/functions/process-tiebreaker/index.ts
// Reveals tiebreaker nominations and resolves ties using the scoring package.

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestBody {
  tiebreaker_id: string;
  action: 'reveal_nominations' | 'resolve';
}

interface NominationRow {
  profile_id: string;
  nominated_event_id: string;
  revealed_at: string | null;
}

interface TiebreakerRow {
  id: string;
  competition_id: string;
  status: string;
  profile_id_a: string;
  profile_id_b: string;
  tiebreaker_event_id: string | null;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    const user = await getAuthenticatedUser(req, userClient);
    const admin = createAdminClient();

    const body: RequestBody = await req.json();

    if (!body.tiebreaker_id || !body.action) {
      return new Response(
        JSON.stringify({ success: false, error: 'tiebreaker_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!['reveal_nominations', 'resolve'].includes(body.action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action must be reveal_nominations or resolve' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch tiebreaker
    const { data: tbData } = await admin
      .from('tiebreakers')
      .select('id, competition_id, status, profile_id_a, profile_id_b, tiebreaker_event_id')
      .eq('id', body.tiebreaker_id)
      .single();

    if (!tbData) {
      return new Response(JSON.stringify({ success: false, error: 'Tiebreaker not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tb = tbData as TiebreakerRow;

    // Verify caller is host or cohost
    const { data: comp } = await admin
      .from('competitions')
      .select('host_id, cohost_id')
      .eq('id', tb.competition_id)
      .single();

    const c = comp as { host_id: string; cohost_id: string | null } | null;
    if (!c || (c.host_id !== user.profileId && c.cohost_id !== user.profileId)) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'reveal_nominations') {
      if (tb.status !== 'pending') {
        return new Response(
          JSON.stringify({ success: false, error: 'Tiebreaker is not in pending state' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Reveal all nominations for this tiebreaker
      await admin
        .from('tiebreaker_nominations')
        .update({ revealed_at: new Date().toISOString() })
        .eq('tiebreaker_id', body.tiebreaker_id);

      // Check if both players nominated the same event
      const { data: nominations } = await admin
        .from('tiebreaker_nominations')
        .select('profile_id, nominated_event_id, revealed_at')
        .eq('tiebreaker_id', body.tiebreaker_id);

      const noms = (nominations ?? []) as NominationRow[];
      const eventIds = noms.map((n) => n.nominated_event_id);
      const agreed = eventIds.length === 2 && eventIds[0] === eventIds[1];

      if (agreed) {
        // Auto-select the agreed event and move to nominated
        await admin
          .from('tiebreakers')
          .update({ status: 'nominated', tiebreaker_event_id: eventIds[0] })
          .eq('id', body.tiebreaker_id);
      } else {
        await admin
          .from('tiebreakers')
          .update({ status: 'nominated' })
          .eq('id', body.tiebreaker_id);
      }

      const response: ApiResponse<{ nominations: NominationRow[]; agreed: boolean }> = {
        success: true,
        data: { nominations: noms, agreed },
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'resolve'
    if (tb.status !== 'nominated' || !tb.tiebreaker_event_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Tiebreaker event has not been selected' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch results for both players in the tiebreaker event
    const { data: resultsData } = await admin
      .from('results')
      .select('profile_id, finishing_place, points_awarded')
      .eq('competition_event_id', tb.tiebreaker_event_id)
      .in('profile_id', [tb.profile_id_a, tb.profile_id_b])
      .not('confirmed_at', 'is', null);

    const tResults = (resultsData ?? []) as Array<{
      profile_id: string;
      finishing_place: number | null;
      points_awarded: number | null;
    }>;

    const resultA = tResults.find((r) => r.profile_id === tb.profile_id_a);
    const resultB = tResults.find((r) => r.profile_id === tb.profile_id_b);

    if (!resultA || !resultB) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both players must have confirmed results for the tiebreaker event' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Lower finishing_place wins (1st beats 2nd)
    const placeA = resultA.finishing_place ?? 999;
    const placeB = resultB.finishing_place ?? 999;
    const winnerId = placeA <= placeB ? tb.profile_id_a : tb.profile_id_b;

    await admin
      .from('tiebreakers')
      .update({
        status: 'resolved',
        winner_profile_id: winnerId,
        resolved_by: user.profileId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', body.tiebreaker_id);

    const response: ApiResponse<{ winner_profile_id: string }> = {
      success: true,
      data: { winner_profile_id: winnerId },
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
