-- Migration 00006: competitions table and invite code generator

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text AS $$
DECLARE
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i      integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.competitions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  description             text,
  country_code            char(2),
  city                    text,
  is_public               boolean NOT NULL DEFAULT true,
  status                  competition_status NOT NULL DEFAULT 'setup',
  host_id                 uuid NOT NULL REFERENCES public.profiles(id),
  cohost_id               uuid REFERENCES public.profiles(id),
  min_events_required     integer NOT NULL,
  total_events            integer NOT NULL DEFAULT 0,
  mvp_voting_enabled      boolean NOT NULL DEFAULT true,
  worst_performer_enabled boolean NOT NULL DEFAULT true,
  voting_locked           boolean NOT NULL DEFAULT false,
  prize_pot_per_person    numeric,
  invite_code             text UNIQUE DEFAULT public.generate_invite_code(),
  season_number           integer NOT NULL DEFAULT 1,
  parent_competition_id   uuid REFERENCES public.competitions(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  started_at              timestamptz,
  completed_at            timestamptz,
  CONSTRAINT name_length CHECK (char_length(name) BETWEEN 3 AND 60),
  CONSTRAINT min_events_positive CHECK (min_events_required > 0),
  CONSTRAINT prize_pot_positive CHECK (prize_pot_per_person IS NULL OR prize_pot_per_person >= 0)
);