-- Private invitations are validated by /api/competitions/join using the service
-- role. A direct SDK call must not bypass that validation by guessing a UUID.
DROP POLICY "Users can join competitions" ON public.competition_members;
CREATE POLICY "Users can join competitions" ON public.competition_members FOR INSERT TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND role = 'competitor'
  AND EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = competition_id AND c.is_public = true
      AND c.status IN ('setup', 'open', 'active')
  )
);
