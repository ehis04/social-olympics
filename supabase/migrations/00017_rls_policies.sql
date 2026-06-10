-- Migration 00017: enable RLS on all tables and define all access policies

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_bests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_rating_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weightlifting_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiebreakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiebreaker_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_vote_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Returns true if the current user is an active member of the given competition
CREATE OR REPLACE FUNCTION public.is_competition_member(comp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competition_members
    WHERE competition_id = comp_id
      AND profile_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns true if the current user is the host or cohost of the given competition
CREATE OR REPLACE FUNCTION public.is_competition_host(comp_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.competitions
    WHERE id = comp_id
      AND (host_id = auth.uid() OR cohost_id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Profile insert via trigger"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- CAREER STATS
CREATE POLICY "Career stats viewable by authenticated users"
  ON public.career_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Career stats updated by system only"
  ON public.career_stats FOR UPDATE
  TO service_role
  USING (true);

-- EVENT CATEGORIES
CREATE POLICY "Event categories viewable by all"
  ON public.event_categories FOR SELECT
  TO authenticated
  USING (true);

-- EVENTS
CREATE POLICY "Events viewable by all"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create custom events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true AND created_by = auth.uid());

-- PERSONAL BESTS
CREATE POLICY "Personal bests viewable by authenticated users"
  ON public.personal_bests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Personal bests managed by system"
  ON public.personal_bests FOR ALL
  TO service_role
  USING (true);

-- COMPETITIONS
CREATE POLICY "Public competitions are viewable by all"
  ON public.competitions FOR SELECT
  TO authenticated
  USING (is_public = true OR public.is_competition_member(id));

CREATE POLICY "Authenticated users can create competitions"
  ON public.competitions FOR INSERT
  TO authenticated
  WITH CHECK (host_id = auth.uid());

CREATE POLICY "Host can update competition"
  ON public.competitions FOR UPDATE
  TO authenticated
  USING (host_id = auth.uid());

-- COMPETITION MEMBERS
CREATE POLICY "Members viewable by competition members or public competition"
  ON public.competition_members FOR SELECT
  TO authenticated
  USING (
    public.is_competition_member(competition_id)
    OR competition_id IN (
      SELECT id FROM public.competitions WHERE is_public = true
    )
  );

CREATE POLICY "Host can manage members"
  ON public.competition_members FOR ALL
  TO authenticated
  USING (public.is_competition_host(competition_id));

CREATE POLICY "Users can join competitions"
  ON public.competition_members FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- COMPETITION EVENTS
CREATE POLICY "Competition events viewable by members"
  ON public.competition_events FOR SELECT
  TO authenticated
  USING (public.is_competition_member(competition_id));

CREATE POLICY "Host can manage competition events"
  ON public.competition_events FOR ALL
  TO authenticated
  USING (public.is_competition_host(competition_id));

-- TEAMS
CREATE POLICY "Teams viewable by competition members"
  ON public.teams FOR SELECT
  TO authenticated
  USING (
    competition_event_id IN (
      SELECT ce.id FROM public.competition_events ce
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

CREATE POLICY "Host manages teams"
  ON public.teams FOR ALL
  TO service_role
  USING (true);

-- TEAM MEMBERS
CREATE POLICY "Team members viewable by competition members"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.competition_events ce ON t.competition_event_id = ce.id
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

-- STRENGTH RATING VOTES
CREATE POLICY "Strength votes viewable by competition members"
  ON public.strength_rating_votes FOR SELECT
  TO authenticated
  USING (
    team_member_id IN (
      SELECT tm.id FROM public.team_members tm
      JOIN public.teams t ON tm.team_id = t.id
      JOIN public.competition_events ce ON t.competition_event_id = ce.id
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

CREATE POLICY "Members can cast strength votes"
  ON public.strength_rating_votes FOR INSERT
  TO authenticated
  WITH CHECK (voter_profile_id = auth.uid());

-- RESULTS
CREATE POLICY "Results viewable by competition members"
  ON public.results FOR SELECT
  TO authenticated
  USING (
    competition_event_id IN (
      SELECT ce.id FROM public.competition_events ce
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

CREATE POLICY "Members can submit results"
  ON public.results FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Host can confirm results"
  ON public.results FOR UPDATE
  TO authenticated
  USING (
    competition_event_id IN (
      SELECT ce.id FROM public.competition_events ce
      WHERE public.is_competition_host(ce.competition_id)
    )
  );

-- RESULT DISPUTES
CREATE POLICY "Disputes viewable by competition members"
  ON public.result_disputes FOR SELECT
  TO authenticated
  USING (
    result_id IN (
      SELECT r.id FROM public.results r
      JOIN public.competition_events ce ON r.competition_event_id = ce.id
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

CREATE POLICY "Members can raise disputes"
  ON public.result_disputes FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid());

CREATE POLICY "Host can resolve disputes"
  ON public.result_disputes FOR UPDATE
  TO authenticated
  USING (
    result_id IN (
      SELECT r.id FROM public.results r
      JOIN public.competition_events ce ON r.competition_event_id = ce.id
      WHERE public.is_competition_host(ce.competition_id)
    )
  );

-- WEIGHTLIFTING BIDS
CREATE POLICY "Bids viewable by competition members"
  ON public.weightlifting_bids FOR SELECT
  TO authenticated
  USING (
    competition_event_id IN (
      SELECT ce.id FROM public.competition_events ce
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

CREATE POLICY "Competitors can submit bids"
  ON public.weightlifting_bids FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- EVENT POINTS CONFIG
CREATE POLICY "Points config viewable by authenticated users"
  ON public.event_points_config FOR SELECT
  TO authenticated
  USING (competition_id IS NULL OR public.is_competition_member(competition_id));

-- TIEBREAKERS
CREATE POLICY "Tiebreakers viewable by competition members"
  ON public.tiebreakers FOR SELECT
  TO authenticated
  USING (public.is_competition_member(competition_id));

-- TIEBREAKER NOMINATIONS (sealed until revealed)
CREATE POLICY "Users can see their own nominations and revealed nominations"
  ON public.tiebreaker_nominations FOR SELECT
  TO authenticated
  USING (nominating_profile_id = auth.uid() OR revealed_at IS NOT NULL);

CREATE POLICY "Users can submit their own nomination"
  ON public.tiebreaker_nominations FOR INSERT
  TO authenticated
  WITH CHECK (nominating_profile_id = auth.uid());

-- PERFORMANCE VOTES (anonymous)
CREATE POLICY "Users can see their own votes"
  ON public.performance_votes FOR SELECT
  TO authenticated
  USING (voter_profile_id = auth.uid());

CREATE POLICY "Members can vote"
  ON public.performance_votes FOR INSERT
  TO authenticated
  WITH CHECK (voter_profile_id = auth.uid());

-- PERFORMANCE VOTE RESULTS
CREATE POLICY "Vote results viewable by competition members"
  ON public.performance_vote_results FOR SELECT
  TO authenticated
  USING (
    competition_event_id IN (
      SELECT ce.id FROM public.competition_events ce
      WHERE public.is_competition_member(ce.competition_id)
    )
  );

-- MESSAGES
CREATE POLICY "Messages viewable by participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (message_type = 'group_chat' AND public.is_competition_member(competition_id))
    OR
    (message_type = 'direct_message' AND
      (sender_profile_id = auth.uid() OR recipient_profile_id = auth.uid()))
  );

CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_profile_id = auth.uid());

CREATE POLICY "Users can soft delete their own messages"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (sender_profile_id = auth.uid());

-- ACTIVITY FEED
CREATE POLICY "Feed viewable by competition members"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (public.is_competition_member(competition_id));

CREATE POLICY "System inserts feed items"
  ON public.activity_feed FOR INSERT
  TO service_role
  WITH CHECK (true);

-- REACTIONS
CREATE POLICY "Reactions viewable by authenticated users"
  ON public.reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own reactions"
  ON public.reactions FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- FEED COMMENTS
CREATE POLICY "Comments viewable by competition members"
  ON public.feed_comments FOR SELECT
  TO authenticated
  USING (
    feed_item_id IN (
      SELECT af.id FROM public.activity_feed af
      WHERE public.is_competition_member(af.competition_id)
    )
  );

CREATE POLICY "Members can comment"
  ON public.feed_comments FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- REPORTS
CREATE POLICY "Users can see their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (reporter_profile_id = auth.uid());

CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_profile_id = auth.uid());

CREATE POLICY "Service role manages all reports"
  ON public.reports FOR ALL
  TO service_role
  USING (true);

-- NOTIFICATIONS
CREATE POLICY "Users can see their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can mark their notifications read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "System creates notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- PUSH TOKENS
CREATE POLICY "Users can manage their own push tokens"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());