/*
 * This migration lets competitions with tiebreakers be deleted cleanly.
 */

-- Nominations already cascade from their tiebreaker; the event reference must
-- cascade too, otherwise deleting a competition fails part-way through.
ALTER TABLE public.tiebreaker_nominations
  DROP CONSTRAINT IF EXISTS tiebreaker_nominations_nominated_event_id_fkey;

ALTER TABLE public.tiebreaker_nominations
  ADD CONSTRAINT tiebreaker_nominations_nominated_event_id_fkey
  FOREIGN KEY (nominated_event_id) REFERENCES public.competition_events(id) ON DELETE CASCADE;
