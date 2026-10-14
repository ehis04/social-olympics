-- Enforce submission ownership and prevent clients from awarding their own
-- points by inserting an already-confirmed result directly through PostgREST.
DROP POLICY "Members can submit results" ON public.results;
CREATE POLICY "Members can submit results" ON public.results FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND confirmed_at IS NULL AND confirmed_by IS NULL
  AND finishing_place IS NULL AND points_awarded IS NULL AND participation_points IS NULL
  AND EXISTS (
    SELECT 1 FROM public.competition_events ce
    JOIN public.competition_members cm ON cm.competition_id = ce.competition_id
    WHERE ce.id = competition_event_id AND ce.status IN ('active', 'results_pending')
      AND cm.profile_id = auth.uid() AND cm.status = 'active' AND cm.role = 'competitor'
      AND (results.profile_id = auth.uid() OR public.is_competition_host(ce.competition_id))
  )
);

DROP POLICY "Members can cast strength votes" ON public.strength_rating_votes;
CREATE POLICY "Members can cast strength votes" ON public.strength_rating_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    JOIN public.competition_events ce ON ce.id = t.competition_event_id
    JOIN public.competition_members cm ON cm.competition_id = ce.competition_id
    WHERE tm.id = team_member_id AND tm.profile_id <> auth.uid()
      AND cm.profile_id = auth.uid() AND cm.status = 'active' AND cm.role = 'competitor'
  )
);
