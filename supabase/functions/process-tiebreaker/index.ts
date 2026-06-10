// supabase/functions/process-tiebreaker/index.ts
// Processes a tiebreaker: reveals nominations, runs the nominated event, resolves the tie

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

    // TODO (Phase 6): Implement full process-tiebreaker logic
    // 1. Parse request body: { tiebreaker_id, action }
    //    action: 'reveal_nominations' | 'resolve'
    // 2. Verify caller is host of the competition
    // 3. For reveal_nominations:
    //    - Set tiebreaker_nominations.revealed_at = now() for both nominations
    //    - Update tiebreaker.status = 'nominated'
    //    - Determine agreed event (if both nominated same) or proceed to
    //      host selection
    // 4. For resolve:
    //    - Compare results for the tiebreaker event
    //    - Set tiebreaker.winner_profile_id and resolved_by
    //    - Update tiebreaker.status = 'resolved'
    // 5. Return resolution details

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