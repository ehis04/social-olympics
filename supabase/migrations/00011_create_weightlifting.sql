-- Migration 00011: weightlifting_bids table

CREATE TABLE public.weightlifting_bids (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  profile_id           uuid NOT NULL REFERENCES public.profiles(id),
  bid_weight_kg        numeric(6,2) NOT NULL,
  bid_round            integer NOT NULL,
  attempt_status       attempt_status NOT NULL DEFAULT 'pending',
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_event_id, profile_id, bid_round),
  CONSTRAINT bid_weight_positive CHECK (bid_weight_kg > 0 AND bid_weight_kg <= 500),
  CONSTRAINT bid_round_positive CHECK (bid_round > 0)
);