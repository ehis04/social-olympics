-- Migration 00004: event_categories and events tables

CREATE TABLE public.event_categories (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     text UNIQUE NOT NULL,
  name     text NOT NULL,
  icon_url text
);

CREATE TABLE public.events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid NOT NULL REFERENCES public.event_categories(id),
  name             text NOT NULL,
  slug             text UNIQUE NOT NULL,
  result_type      result_type NOT NULL,
  is_team_event    boolean NOT NULL DEFAULT false,
  min_team_size    integer,
  max_team_size    integer,
  similarity_group text,
  is_custom        boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES public.profiles(id),
  description      text,
  scoring_notes    text,
  is_active        boolean NOT NULL DEFAULT true,
  CONSTRAINT team_size_valid CHECK (
    (is_team_event = false)
    OR (
      min_team_size IS NOT NULL
      AND max_team_size IS NOT NULL
      AND min_team_size >= 1
      AND max_team_size >= min_team_size
    )
  )
);