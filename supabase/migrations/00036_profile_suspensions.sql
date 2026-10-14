/*
 * This migration records moderation suspensions so they can be enforced.
 */

-- A suspended profile cannot create new competitions. Rows are written by the
-- moderation API with the service role; users may only read their own suspension.
CREATE TABLE IF NOT EXISTS public.profile_suspensions (
  profile_id   uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason       text,
  report_id    uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  suspended_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own suspension" ON public.profile_suspensions;
CREATE POLICY "Users can see their own suspension"
  ON public.profile_suspensions FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.profile_suspensions FROM authenticated, anon;
GRANT SELECT ON public.profile_suspensions TO authenticated;
GRANT ALL PRIVILEGES ON public.profile_suspensions TO service_role;
