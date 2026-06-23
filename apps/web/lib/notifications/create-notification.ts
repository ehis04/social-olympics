import type { SupabaseClient } from '@supabase/supabase-js';

interface NotificationPayload {
  profileId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function createNotification(
  client: SupabaseClient,
  payload: NotificationPayload,
) {
  return client.from('notifications').insert({
    profile_id: payload.profileId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  });
}

export async function createNotifications(
  client: SupabaseClient,
  payloads: NotificationPayload[],
) {
  if (payloads.length === 0) return { error: null };

  return client.from('notifications').insert(
    payloads.map((payload) => ({
      profile_id: payload.profileId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    })),
  );
}
