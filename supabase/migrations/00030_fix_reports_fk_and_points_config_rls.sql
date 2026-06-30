-- Migration 00030: Fix reports.reviewed_by FK and add event_points_config write policies

-- 1. Add missing FK on reports.reviewed_by so referential integrity is enforced
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Add INSERT/UPDATE/DELETE policies for event_points_config so competition
--    hosts can manage custom per-competition point values (service_role already
--    has full access; these policies cover the authenticated role).

CREATE POLICY "Hosts can insert competition-specific points config"
  ON public.event_points_config FOR INSERT
  TO authenticated
  WITH CHECK (
    competition_id IS NOT NULL
    AND public.is_competition_host(competition_id)
  );

CREATE POLICY "Hosts can update competition-specific points config"
  ON public.event_points_config FOR UPDATE
  TO authenticated
  USING (
    competition_id IS NOT NULL
    AND public.is_competition_host(competition_id)
  );

CREATE POLICY "Hosts can delete competition-specific points config"
  ON public.event_points_config FOR DELETE
  TO authenticated
  USING (
    competition_id IS NOT NULL
    AND public.is_competition_host(competition_id)
  );
