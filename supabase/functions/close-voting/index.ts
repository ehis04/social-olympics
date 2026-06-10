// supabase/functions/close-voting/index.ts
// Closes MVP and worst performer voting for an event, tallies votes, applies bonus points

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    const user = await getAuthenticatedUser(req, userClient);

    // TODO (Phase 6): Implement full close-voting logic
    // 1. Parse request body: { competition_event_id }
    // 2. Verify caller is host or cohost
    // 3. Tally votes for mvp and worst_performer vote_types
    // 4. Insert rows into performance_vote_results
    // 5. Apply bonus_points (+1 MVP, -1 worst performer) by calling
    //    recalculate_member_score for affected members
    // 6. Return vote results summary

    const response: ApiResponse = { success: true };
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const response: ApiResponse = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
    return new Response(JSON.stringify(response), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});