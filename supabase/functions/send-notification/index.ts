// supabase/functions/send-notification/index.ts
// Sends push notifications via Expo Push Service and inserts in-app notification rows

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

    // TODO (Phase 6): Implement full send-notification logic
    // 1. Parse request body: { profile_ids, type, title, body, data }
    // 2. Verify caller is service_role or host of relevant competition
    // 3. Insert rows into notifications table for each profile_id
    // 4. Fetch push_tokens for each profile_id
    // 5. Send push notifications via Expo Push API:
    //    POST https://exp.host/--/api/v2/push/send
    // 6. Update push_tokens.last_used_at
    // 7. Return delivery receipt summary

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