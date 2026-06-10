// Activity feed and reaction types.

import type { ReactionTargetType } from '../database/enums';
import type { ProfileSummary } from '../users/profile';

export type FeedEventType =
  | 'result_confirmed'
  | 'event_started'
  | 'event_confirmed'
  | 'competition_started'
  | 'competition_complete'
  | 'member_joined'
  | 'dispute_raised'
  | 'dispute_resolved'
  | 'mvp_awarded'
  | 'worst_performer_awarded'
  | 'tiebreaker_required'
  | 'podium_generated';

export interface FeedItem {
  id: string;
  competition_id: string;
  event_type: FeedEventType;
  actor_profile_id: string | null;
  subject_profile_id: string | null;
  competition_event_id: string | null;
  metadata: FeedItemMetadata;
  created_at: string;
}

export type FeedItemWithProfiles = FeedItem & {
  actor?: ProfileSummary;
  subject?: ProfileSummary;
};

export type FeedItemMetadata =
  | { points: number; place: number; event_name: string }
  | { event_name: string }
  | { display_name: string }
  | { reason: string }
  | { winner_display_name: string }
  | Record<string, unknown>;

export interface Reaction {
  id: string;
  target_type: ReactionTargetType;
  target_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

export interface FeedComment {
  id: string;
  feed_item_id: string;
  profile_id: string;
  content: string;
  created_at: string;
}

export type FeedCommentWithProfile = FeedComment & { profile: ProfileSummary };
