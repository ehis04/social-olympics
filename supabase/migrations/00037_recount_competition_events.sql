/*
 * This migration corrects competition event counts that were double-counted at creation.
 */

-- Competitions created through the app stored the initial event count and the
-- insert trigger then added each event again. Recount from the events themselves.
UPDATE public.competitions c
SET total_events = counts.actual
FROM (
  SELECT competitions.id, count(competition_events.id)::integer AS actual
  FROM public.competitions
  LEFT JOIN public.competition_events ON competition_events.competition_id = competitions.id
  GROUP BY competitions.id
) AS counts
WHERE counts.id = c.id
  AND c.total_events IS DISTINCT FROM counts.actual;
