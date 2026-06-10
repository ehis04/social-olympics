-- Migration 00009: teams, team_members, and strength_rating_votes tables

CREATE TABLE public.teams (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_event_id uuid NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  total_strength       numeric,
  result_place         integer,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.profiles(id),
  strength_rating numeric NOT NULL,
  rating_source   rating_source NOT NULL,
  confirmed_at    timestamptz,
  CONSTRAINT strength_rating_range CHECK (strength_rating >= 1 AND strength_rating <= 10),
  UNIQUE (team_id, profile_id)
);

CREATE TABLE public.strength_rating_votes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id   uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  voter_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  vote             strength_vote NOT NULL,
  submission_round integer NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, voter_profile_id, submission_round),
  CONSTRAINT round_valid CHECK (submission_round IN (1, 2))
);