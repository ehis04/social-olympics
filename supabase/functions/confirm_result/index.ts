// supabase/functions/confirm-result/index.ts
// Confirms a result, assigns finishing place and points, triggers score recalculation

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

    // TODO (Phase 6): Implement full confirm-result logic
    // 1. Parse request body: { result_id, finishing_place, points_awarded }
    // 2. Verify caller is host or cohost of the competition
    // 3. Update results row: finishing_place, points_awarded, participation_points,
    //    confirmed_by, confirmed_at
    // 4. DB trigger on_result_confirmed fires automatically to recalculate scores
    // 5. Return updated result row

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