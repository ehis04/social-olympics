// supabase/functions/send-notification/index.ts
// Inserts in-app notification rows and sends Expo push notifications.

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { getAuthenticatedUser } from '../_shared/auth.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase-client.ts';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RequestBody {
  profile_ids: string[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushToken {
  profile_id: string;
  token: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userClient = createUserClient(req);
    await getAuthenticatedUser(req, userClient);
    const admin = createAdminClient();

    const body: RequestBody = await req.json();

    if (!Array.isArray(body.profile_ids) || body.profile_ids.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'profile_ids must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!body.type || !body.title || !body.body) {
      return new Response(
        JSON.stringify({ success: false, error: 'type, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Insert in-app notification rows
    const notificationRows = body.profile_ids.map((profile_id) => ({
      profile_id,
      type: body.type,
      title: body.title,
      body: body.body,
      data: body.data ?? {},
      read: false,
    }));

    const { error: insertError } = await admin.from('notifications').insert(notificationRows);
    if (insertError) throw new Error(insertError.message);

    // Fetch push tokens
    const { data: tokenRows } = await admin
      .from('push_tokens')
      .select('profile_id, token')
      .in('profile_id', body.profile_ids)
      .eq('is_active', true);

    const tokens = (tokenRows ?? []) as PushToken[];

    let pushSent = 0;
    let pushFailed = 0;

    if (tokens.length > 0) {
      const messages: ExpoPushMessage[] = tokens.map((t) => ({
        to: t.token,
        title: body.title,
        body: body.body,
        data: body.data,
        sound: 'default',
      }));

      const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });

      if (expoRes.ok) {
        const expoBody = (await expoRes.json()) as { data: ExpoPushTicket[] };
        const tickets = expoBody.data ?? [];
        pushSent = tickets.filter((t) => t.status === 'ok').length;
        pushFailed = tickets.filter((t) => t.status === 'error').length;

        // Update last_used_at for successful tokens
        await admin
          .from('push_tokens')
          .update({ last_used_at: new Date().toISOString() })
          .in('token', tokens.map((t) => t.token));
      }
    }

    const response: ApiResponse<{ notified: number; push_sent: number; push_failed: number }> = {
      success: true,
      data: {
        notified: body.profile_ids.length,
        push_sent: pushSent,
        push_failed: pushFailed,
      },
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
