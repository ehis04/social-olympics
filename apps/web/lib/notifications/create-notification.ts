/*
 * This file defines the create notification module.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface NotificationPayload {
  profileId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_SIZE = 100;
const PUSH_TIMEOUT_MS = 4000;

// Sends push notifications to the recipients' registered devices through Expo.
// Delivery is best effort: failures never block the in-app notification.
async function sendPushNotifications(client: SupabaseClient, payloads: NotificationPayload[]): Promise<void> {
  try {
    const profileIds = [...new Set(payloads.map((payload) => payload.profileId))];
    const { data: tokenRows } = await client
      .from('push_tokens')
      .select('profile_id, token')
      .in('profile_id', profileIds);
    if (!tokenRows || tokenRows.length === 0) return;

    const messages = payloads.flatMap((payload) =>
      tokenRows
        .filter((row) => row.profile_id === payload.profileId)
        .map((row) => ({
          to: row.token as string,
          title: payload.title,
          body: payload.body,
          sound: 'default' as const,
          data: { ...(payload.data ?? {}), type: payload.type },
        })),
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;

    const staleTokens: string[] = [];
    for (let start = 0; start < messages.length; start += EXPO_BATCH_SIZE) {
      const batch = messages.slice(start, start + EXPO_BATCH_SIZE);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const body = (await response.json()) as { data?: ExpoPushTicket[] };
        (body.data ?? []).forEach((ticket, index) => {
          // Expo reports uninstalled apps and expired tokens; stop sending to them.
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const token = batch[index]?.to;
            if (token) staleTokens.push(token);
          }
        });
      } catch {
        // Network problems or timeouts only affect push delivery.
      } finally {
        clearTimeout(timer);
      }
    }

    if (staleTokens.length > 0) {
      await client.from('push_tokens').delete().in('token', staleTokens);
    }
  } catch {
    // Push delivery must never break the request that created the notification.
  }
}

// Handles create notification.
export async function createNotification(
  client: SupabaseClient,
  payload: NotificationPayload,
) {
  return createNotifications(client, [payload]);
}

// Handles create notifications.
export async function createNotifications(
  client: SupabaseClient,
  payloads: NotificationPayload[],
) {
  if (payloads.length === 0) return { error: null };

  const result = await client.from('notifications').insert(
    payloads.map((payload) => ({
      profile_id: payload.profileId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    })),
  );

  if (!result.error) await sendPushNotifications(client, payloads);
  return result;
}
