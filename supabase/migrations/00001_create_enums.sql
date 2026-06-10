-- Migration 00001: all platform enum types
CREATE TYPE result_type AS ENUM (
  'time', 'distance', 'score', 'inverted_score',
  'weight', 'compound', 'possession'
);

CREATE TYPE competition_status AS ENUM (
  'setup', 'open', 'active', 'complete', 'archived'
);

CREATE TYPE competition_event_status AS ENUM (
  'pending', 'active', 'results_pending', 'disputed', 'confirmed', 'cancelled'
);

CREATE TYPE member_role AS ENUM (
  'competitor', 'spectator', 'cohost'
);

CREATE TYPE member_status AS ENUM (
  'invited', 'active', 'withdrawn'
);

CREATE TYPE weight_tag AS ENUM (
  'not_important', 'standard', 'important', 'very_important', 'custom'
);

CREATE TYPE rating_source AS ENUM (
  'historical', 'peer_voted', 'host_set'
);

CREATE TYPE attempt_status AS ENUM (
  'pending', 'success', 'fail', 'withdrawn'
);

CREATE TYPE tiebreaker_status AS ENUM (
  'pending_nomination', 'nominated', 'in_progress', 'resolved'
);

CREATE TYPE tiebreaker_resolved_by AS ENUM (
  'medal_count', 'event_nomination', 'raw_margin', 'host'
);

CREATE TYPE vote_type AS ENUM (
  'mvp', 'worst_performer'
);

CREATE TYPE strength_vote AS ENUM (
  'confirm', 'reject'
);

CREATE TYPE message_type AS ENUM (
  'group_chat', 'direct_message'
);

CREATE TYPE reaction_target_type AS ENUM (
  'feed_item', 'message'
);

CREATE TYPE report_target_type AS ENUM (
  'competition', 'profile', 'message'
);

CREATE TYPE report_status AS ENUM (
  'pending', 'reviewed', 'actioned', 'dismissed'
);

CREATE TYPE dispute_status AS ENUM (
  'open', 'resolved', 'dismissed'
);

CREATE TYPE platform_type AS ENUM (
  'ios', 'android', 'web'
);