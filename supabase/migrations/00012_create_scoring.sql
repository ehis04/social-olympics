-- Migration 00012: event_points_config, tiebreakers, and tiebreaker_nominations tables

CREATE TABLE public.event_points_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  uuid REFERENCES public.competitions(id) ON DELETE CASCADE,
  finishing_place integer NOT NULL,
  points_value    numeric NOT NULL,
  CONSTRAINT place_positive CHECK (finishing_place > 0),
  CONSTRAINT points_non_negative CHECK (points_value >= 0)
);

-- Partial unique indexes handle NULL competition_id correctly
-- (standard UNIQUE does not treat NULLs as equal in PostgreSQL)
CREATE UNIQUE INDEX event_points_config_global_unique
  ON public.event_points_config (finishing_place)
  WHERE competition_id IS NULL;

CREATE UNIQUE INDEX event_points_config_competition_unique
  ON public.event_points_config (competition_id, finishing_place)
  WHERE competition_id IS NOT NULL;

CREATE TABLE public.tiebreakers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id    uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  profile_id_a      uuid NOT NULL REFERENCES public.profiles(id),
  profile_id_b      uuid NOT NULL REFERENCES public.profiles(id),
  status            tiebreaker_status NOT NULL DEFAULT 'pending_nomination',
  winner_profile_id uuid REFERENCES public.profiles(id),
  resolved_by       tiebreaker_resolved_by,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT different_profiles CHECK (profile_id_a <> profile_id_b)
);

CREATE TABLE public.tiebreaker_nominations (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tiebreaker_id         uuid NOT NULL REFERENCES public.tiebreakers(id) ON DELETE CASCADE,
  nominating_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  nominated_event_id    uuid NOT NULL REFERENCES public.competition_events(id),
  submitted_at          timestamptz NOT NULL DEFAULT now(),
  revealed_at           timestamptz,
  UNIQUE (tiebreaker_id, nominating_profile_id)
);