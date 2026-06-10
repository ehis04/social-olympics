-- Migration 00008: competition_events table and deferred FK to personal_bests

CREATE TABLE public.competition_events (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id           uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  event_id                 uuid NOT NULL REFERENCES public.events(id),
  name_override            text,
  weight_tag               weight_tag NOT NULL DEFAULT 'standard',
  weight_multiplier        numeric NOT NULL DEFAULT 1.0,
  scheduled_at             timestamptz,
  status                   competition_event_status NOT NULL DEFAULT 'pending',
  sequence_order           integer NOT NULL,
  started_at               timestamptz,
  confirmed_at             timestamptz,
  dispute_window_closes_at timestamptz,
  cancelled_reason         text,
  CONSTRAINT weight_multiplier_range CHECK (
    weight_multiplier >= 0.1 AND weight_multiplier <= 3.0
  )
);

ALTER TABLE public.personal_bests
  ADD CONSTRAINT personal_bests_competition_event_fk
  FOREIGN KEY (competition_event_id)
  REFERENCES public.competition_events(id)
  ON DELETE SET NULL;