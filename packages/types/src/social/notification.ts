// Notification and push token types.

import type { Platform } from '../database/enums';

export interface Notification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPayload {
  profile_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationDeepLink {
  screen: string;
  params: Record<string, string>;
}

export interface PushToken {
  id: string;
  profile_id: string;
  token: string;
  platform: Platform;
  created_at: string;
  updated_at: string;
}

export interface RegisterPushTokenPayload {
  token: string;
  platform: Platform;
}
