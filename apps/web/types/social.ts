// Shared social types for feed, chat, and notification features

export interface ProfileSnippet {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FeedItem {
  id: string;
  competition_id: string;
  activity_type: string;
  actor_profile_id: string | null;
  subject_profile_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: ProfileSnippet | null;
  subject: ProfileSnippet | null;
}

export interface ChatMessage {
  id: string;
  competition_id: string | null;
  sender_profile_id: string;
  recipient_profile_id: string | null;
  message_type: 'group_chat' | 'direct_message';
  content: string;
  deleted_at: string | null;
  created_at: string;
  sender: ProfileSnippet | null;
}

export interface Conversation {
  id: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  content: string;
  created_at: string;
  sender: ProfileSnippet | null;
  recipient: ProfileSnippet | null;
}

export interface Notification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export function isFeedItem(v: unknown): v is FeedItem {
  return typeof v === 'object' && v !== null && 'activity_type' in v;
}

export function isChatMessage(v: unknown): v is ChatMessage {
  return typeof v === 'object' && v !== null && 'message_type' in v && 'sender_profile_id' in v;
}

export function isNotification(v: unknown): v is Notification {
  return typeof v === 'object' && v !== null && 'type' in v && 'title' in v && 'profile_id' in v;
}
