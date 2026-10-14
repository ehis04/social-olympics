-- Match API voting rules at the database boundary, including direct SDK calls.
DROP POLICY IF EXISTS "Members can vote" ON public.performance_votes;
CREATE POLICY "Members can vote" ON public.performance_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_profile_id = auth.uid()
  AND voter_profile_id <> voted_for_profile_id
  AND EXISTS (
    SELECT 1 FROM public.competition_events ce
    JOIN public.competition_members voter ON voter.competition_id = ce.competition_id
    JOIN public.competition_members candidate ON candidate.competition_id = ce.competition_id
    WHERE ce.id = competition_event_id
      AND voter.profile_id = auth.uid() AND voter.status = 'active' AND voter.role = 'competitor'
      AND candidate.profile_id = voted_for_profile_id AND candidate.status = 'active' AND candidate.role = 'competitor'
  )
);

CREATE POLICY "Members can change their votes" ON public.performance_votes FOR UPDATE TO authenticated
USING (voter_profile_id = auth.uid())
WITH CHECK (
  voter_profile_id = auth.uid()
  AND voter_profile_id <> voted_for_profile_id
  AND EXISTS (
    SELECT 1 FROM public.competition_events ce
    JOIN public.competition_members voter ON voter.competition_id = ce.competition_id
    JOIN public.competition_members candidate ON candidate.competition_id = ce.competition_id
    WHERE ce.id = competition_event_id
      AND voter.profile_id = auth.uid() AND voter.status = 'active' AND voter.role = 'competitor'
      AND candidate.profile_id = voted_for_profile_id AND candidate.status = 'active' AND candidate.role = 'competitor'
  )
);

-- Internal mutation functions run through owner-executed triggers or the service
-- role. Exposing them as authenticated RPCs bypasses row-level protections.
REVOKE EXECUTE ON FUNCTION public.recalculate_member_score(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_career_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_personal_best(uuid, uuid, numeric, numeric, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_competition_total_events(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_competition_total_events(uuid) FROM PUBLIC, anon, authenticated;
