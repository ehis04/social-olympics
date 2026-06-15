// supabase/functions/confirm_result/index.ts
// Confirms a result, assigns finishing place and points, triggers score recalculation.

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestBody {
  result_id: string;
  finishing_place: number;
  points_awarded: number;
  participation_points: number;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    const user = await getAuthenticatedUser(req, userClient);
    const admin = createAdminClient();

    const body: RequestBody = await req.json();

    if (!body.result_id || body.finishing_place == null || body.points_awarded == null) {
      return new Response(
        JSON.stringify({ success: false, error: 'result_id, finishing_place, and points_awarded are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch result to get competition context
    const { data: resultData } = await admin
      .from('results')
      .select('competition_event_id, confirmed_at')
      .eq('id', body.result_id)
      .single();

    if (!resultData) {
      return new Response(JSON.stringify({ success: false, error: 'Result not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = resultData as { competition_event_id: string; confirmed_at: string | null };

    if (result.confirmed_at) {
      return new Response(JSON.stringify({ success: false, error: 'Result is already confirmed' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is host or cohost of the competition
    const { data: eventData } = await admin
      .from('competition_events')
      .select('competition_id')
      .eq('id', result.competition_event_id)
      .single();

    const ev = eventData as { competition_id: string } | null;
    if (!ev) {
      return new Response(JSON.stringify({ success: false, error: 'Event not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: comp } = await admin
      .from('competitions')
      .select('host_id, cohost_id')
      .eq('id', ev.competition_id)
      .single();

    const c = comp as { host_id: string; cohost_id: string | null } | null;
    if (!c || (c.host_id !== user.profileId && c.cohost_id !== user.profileId)) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirm the result
    const { data: updated, error: updateError } = await admin
      .from('results')
      .update({
        finishing_place: body.finishing_place,
        points_awarded: body.points_awarded,
        participation_points: body.participation_points ?? 0,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.profileId,
      })
      .eq('id', body.result_id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    // Set dispute window — 24 hours from now
    const windowCloses = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from('competition_events')
      .update({ dispute_window_closes_at: windowCloses })
      .eq('id', result.competition_event_id);

    const response: ApiResponse<unknown> = { success: true, data: updated };
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
