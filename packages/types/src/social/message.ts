// Messaging and conversation types.

import type { MessageType } from '../database/enums';
import type { ProfileSummary } from '../users/profile';

export interface Message {
  id: string;
  sender_id: string;
  competition_id: string | null;
  recipient_profile_id: string | null;
  message_type: MessageType;
  content: string;
  sent_at: string;
  edited_at: string | null;
}

export type MessageWithSender = Message & { sender: ProfileSummary };

export interface SendMessagePayload {
  content: string;
  message_type: MessageType;
  competition_id?: string;
  recipient_profile_id?: string;
}

export interface Conversation {
  other_profile: ProfileSummary;
  latest_message: Message;
  unread_count: number;
}
