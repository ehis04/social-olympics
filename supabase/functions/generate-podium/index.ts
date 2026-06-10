// supabase/functions/generate-podium/index.ts
// Finalises a competition: assigns final ranks, generates podium, marks competition complete

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

    // TODO (Phase 6): Implement full generate-podium logic
    // 1. Parse request body: { competition_id }
    // 2. Verify caller is host of the competition
    // 3. Order competition_members by total_points DESC, applying tiebreaker
    //    results for any tied pairs
    // 4. Assign final_rank to each competition_member
    // 5. Update competitions.status = 'complete', completed_at = now()
    // 6. Insert activity_feed row: event_type = 'podium_generated' with
    //    metadata containing top 3 profile summaries
    // 7. Call send-notification for all members announcing the final result
    // 8. Return final leaderboard with podium top 3

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