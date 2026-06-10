// TypeScript union types mirroring all PostgreSQL enums — must stay in sync.

export type ResultType =
  | 'time'
  | 'distance'
  | 'score'
  | 'inverted_score'
  | 'weight'
  | 'compound'
  | 'possession';

export type CompetitionStatus =
  | 'setup'
  | 'open'
  | 'active'
  | 'complete'
  | 'archived';

export type CompetitionEventStatus =
  | 'pending'
  | 'active'
  | 'results_pending'
  | 'disputed'
  | 'confirmed'
  | 'cancelled';

export type MemberRole = 'competitor' | 'spectator' | 'cohost';

export type MemberStatus = 'invited' | 'active' | 'withdrawn';

export type WeightTag =
  | 'not_important'
  | 'standard'
  | 'important'
  | 'very_important'
  | 'custom';

export type RatingSource = 'historical' | 'peer_voted' | 'host_set';

export type AttemptStatus = 'pending' | 'success' | 'fail' | 'withdrawn';

export type TiebreakerStatus =
  | 'pending_nomination'
  | 'nominated'
  | 'in_progress'
  | 'resolved';

export type TiebreakerResolvedBy =
  | 'medal_count'
  | 'event_nomination'
  | 'raw_margin'
  | 'host';

export type VoteType = 'mvp' | 'worst_performer';

export type StrengthVote = 'confirm' | 'reject';

export type MessageType = 'group_chat' | 'direct_message';

export type ReactionTargetType = 'feed_item' | 'message';

export type ReportTargetType = 'competition' | 'profile' | 'message';

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type DisputeStatus = 'open' | 'resolved' | 'dismissed';

export type Platform = 'ios' | 'android' | 'web';
