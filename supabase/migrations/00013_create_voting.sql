-- Migration 00013: performance_votes and performance_vote_results tables

CREATE TABLE public.performance_votes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  voter_profile_id     uuid NOT NULL REFERENCES public.profiles(id),
  voted_for_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  vote_type            vote_type NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_event_id, voter_profile_id, vote_type),
  CONSTRAINT no_self_mvp CHECK (
    vote_type <> 'mvp' OR voter_profile_id <> voted_for_profile_id
  )
);

CREATE TABLE public.performance_vote_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  vote_type            vote_type NOT NULL,
  winner_profile_id    uuid NOT NULL REFERENCES public.profiles(id),
  vote_count           integer NOT NULL,
  bonus_points         numeric NOT NULL,
  applied_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_event_id, vote_type)
);