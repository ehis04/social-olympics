// supabase/functions/calculate-scores/index.ts
// Recalculates all member scores for a competition after a scoring change

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

    // TODO (Phase 6): Implement full calculate-scores logic
    // 1. Parse request body: { competition_id }
    // 2. Verify caller is host or cohost
    // 3. For each active competition_member, call DB function
    //    recalculate_member_score(profile_id, competition_id)
    // 4. Return updated leaderboard snapshot

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