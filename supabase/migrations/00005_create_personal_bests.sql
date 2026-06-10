-- Migration 00005: personal_bests table (FK to competition_events added in 00008)

CREATE TABLE public.personal_bests (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id               uuid NOT NULL REFERENCES public.events(id),
  result_value_primary   numeric NOT NULL,
  result_value_secondary numeric,
  achieved_at            timestamptz NOT NULL,
  competition_event_id   uuid,
  UNIQUE (profile_id, event_id)
);