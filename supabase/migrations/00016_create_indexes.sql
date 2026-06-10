-- Migration 00016: performance indexes across all tables

-- competition_members
CREATE INDEX idx_competition_members_competition ON public.competition_members(competition_id);
CREATE INDEX idx_competition_members_profile ON public.competition_members(profile_id);
CREATE INDEX idx_competition_members_leaderboard ON public.competition_members(competition_id, total_points DESC);

-- competition_events
CREATE INDEX idx_competition_events_competition ON public.competition_events(competition_id);
CREATE INDEX idx_competition_events_ordered ON public.competition_events(competition_id, sequence_order);

-- results
CREATE INDEX idx_results_competition_event ON public.results(competition_event_id);
CREATE INDEX idx_results_placing ON public.results(competition_event_id, finishing_place);
CREATE INDEX idx_results_profile ON public.results(profile_id);
CREATE INDEX idx_results_profile_event ON public.results(profile_id, competition_event_id);

-- messages
CREATE INDEX idx_messages_group_chat ON public.messages(competition_id, created_at DESC)
  WHERE message_type = 'group_chat';
CREATE INDEX idx_messages_dm ON public.messages(sender_profile_id, recipient_profile_id, created_at DESC)
  WHERE message_type = 'direct_message';

-- activity_feed
CREATE INDEX idx_activity_feed_competition ON public.activity_feed(competition_id, created_at DESC);

-- notifications
CREATE INDEX idx_notifications_profile ON public.notifications(profile_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(profile_id, read_at)
  WHERE read_at IS NULL;

-- personal_bests
CREATE INDEX idx_personal_bests_profile_event ON public.personal_bests(profile_id, event_id);

-- weightlifting_bids
CREATE INDEX idx_weightlifting_bids_event_round ON public.weightlifting_bids(competition_event_id, bid_round);

-- performance_votes
CREATE INDEX idx_performance_votes_event_type ON public.performance_votes(competition_event_id, vote_type);

-- strength_rating_votes
CREATE INDEX idx_strength_votes_member_round ON public.strength_rating_votes(team_member_id, submission_round);

-- push_tokens
CREATE INDEX idx_push_tokens_profile ON public.push_tokens(profile_id);

-- competitions (discovery)
CREATE INDEX idx_competitions_public ON public.competitions(is_public, status, created_at DESC)
  WHERE is_public = true;
CREATE INDEX idx_competitions_country ON public.competitions(country_code)
  WHERE is_public = true;