-- Migration 00029: competition_event_participants — pre-assigned participants per event

CREATE TABLE public.competition_event_participants (
  competition_event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  profile_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by          uuid REFERENCES public.profiles(id),
  assigned_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (competition_event_id, profile_id)
);

ALTER TABLE public.competition_event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Competition members can view event participants"
  ON public.competition_event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_events ce
      JOIN public.competition_members cm ON cm.competition_id = ce.competition_id
      WHERE ce.id = competition_event_id
        AND cm.profile_id = auth.uid()
        AND cm.status = 'active'
    )
  );

CREATE POLICY "Hosts can manage event participants"
  ON public.competition_event_participants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_events ce
      JOIN public.competitions c ON c.id = ce.competition_id
      WHERE ce.id = competition_event_id
        AND (c.host_id = auth.uid() OR c.cohost_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competition_events ce
      JOIN public.competitions c ON c.id = ce.competition_id
      WHERE ce.id = competition_event_id
        AND (c.host_id = auth.uid() OR c.cohost_id = auth.uid())
    )
  );
