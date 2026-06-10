-- Migration 00007: competition_members table

CREATE TABLE public.competition_members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  profile_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role             member_role NOT NULL DEFAULT 'competitor',
  status           member_status NOT NULL DEFAULT 'invited',
  joined_at        timestamptz,
  total_points     numeric NOT NULL DEFAULT 0,
  events_completed integer NOT NULL DEFAULT 0,
  gold_count       integer NOT NULL DEFAULT 0,
  silver_count     integer NOT NULL DEFAULT 0,
  bronze_count     integer NOT NULL DEFAULT 0,
  final_rank       integer,
  UNIQUE (competition_id, profile_id)
);