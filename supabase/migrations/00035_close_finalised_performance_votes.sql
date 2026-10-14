-- Event selection locking is separate from performance-award voting. Enforce
-- award timing and closure for direct SDK calls as well as API requests.
DROP POLICY IF EXISTS "Members can vote" ON public.performance_votes;
DROP POLICY IF EXISTS "Members can change their votes" ON public.performance_votes;

CREATE POLICY "Members can vote" ON public.performance_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_profile_id = auth.uid() AND voter_profile_id <> voted_for_profile_id
  AND EXISTS (
    SELECT 1 FROM public.competition_events ce
    JOIN public.competitions c ON c.id = ce.competition_id
    JOIN public.competition_members voter ON voter.competition_id = c.id
    JOIN public.competition_members candidate ON candidate.competition_id = c.id
    WHERE ce.id = competition_event_id AND ce.status = 'confirmed'
      AND c.status NOT IN ('complete', 'archived')
      AND (vote_type = 'mvp' AND c.mvp_voting_enabled OR vote_type = 'worst_performer' AND c.worst_performer_enabled)
      AND voter.profile_id = auth.uid() AND voter.status = 'active' AND voter.role = 'competitor'
      AND candidate.profile_id = voted_for_profile_id AND candidate.status = 'active' AND candidate.role = 'competitor'
  )
  AND NOT EXISTS (SELECT 1 FROM public.performance_vote_results pvr
    WHERE pvr.competition_event_id = performance_votes.competition_event_id AND pvr.vote_type = performance_votes.vote_type)
);

CREATE POLICY "Members can change their votes" ON public.performance_votes FOR UPDATE TO authenticated
USING (voter_profile_id = auth.uid())
WITH CHECK (
  voter_profile_id = auth.uid() AND voter_profile_id <> voted_for_profile_id
  AND EXISTS (
    SELECT 1 FROM public.competition_events ce
    JOIN public.competitions c ON c.id = ce.competition_id
    JOIN public.competition_members voter ON voter.competition_id = c.id
    JOIN public.competition_members candidate ON candidate.competition_id = c.id
    WHERE ce.id = competition_event_id AND ce.status = 'confirmed'
      AND c.status NOT IN ('complete', 'archived')
      AND (vote_type = 'mvp' AND c.mvp_voting_enabled OR vote_type = 'worst_performer' AND c.worst_performer_enabled)
      AND voter.profile_id = auth.uid() AND voter.status = 'active' AND voter.role = 'competitor'
      AND candidate.profile_id = voted_for_profile_id AND candidate.status = 'active' AND candidate.role = 'competitor'
  )
  AND NOT EXISTS (SELECT 1 FROM public.performance_vote_results pvr
    WHERE pvr.competition_event_id = performance_votes.competition_event_id AND pvr.vote_type = performance_votes.vote_type)
);
