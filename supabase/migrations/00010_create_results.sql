-- Migration 00010: results and result_disputes tables

CREATE TABLE public.results (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_event_id   uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  profile_id             uuid NOT NULL REFERENCES public.profiles(id),
  team_id                uuid REFERENCES public.teams(id),
  result_value_primary   numeric,
  result_value_secondary numeric,
  is_dnf                 boolean NOT NULL DEFAULT false,
  is_disqualified        boolean NOT NULL DEFAULT false,
  finishing_place        integer,
  points_awarded         numeric,
  participation_points   numeric,
  submitted_by           uuid NOT NULL REFERENCES public.profiles(id),
  submitted_at           timestamptz NOT NULL DEFAULT now(),
  confirmed_by           uuid REFERENCES public.profiles(id),
  confirmed_at           timestamptz,
  evidence_url           text,
  notes                  text,
  UNIQUE (competition_event_id, profile_id)
);

CREATE TABLE public.result_disputes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id   uuid NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  raised_by   uuid NOT NULL REFERENCES public.profiles(id),
  reason      text NOT NULL,
  status      dispute_status NOT NULL DEFAULT 'open',
  resolved_by uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);