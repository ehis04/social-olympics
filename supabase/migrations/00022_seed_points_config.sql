-- Migration 00022: seed global default points scale (permanent data migration)
-- competition_id = NULL means this is the global default, applied to all competitions
-- that do not define a custom points config.
-- Partial unique index in 00012 ensures NULL competition_id rows are correctly de-duped.

INSERT INTO public.event_points_config (competition_id, finishing_place, points_value) VALUES
  (NULL, 1, 10),
  (NULL, 2, 6),
  (NULL, 3, 3),
  (NULL, 4, 1),
  (NULL, 5, 0.5)
ON CONFLICT DO NOTHING;