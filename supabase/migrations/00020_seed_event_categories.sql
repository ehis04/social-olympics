-- Migration 00020: seed event categories (permanent data migration)

INSERT INTO public.event_categories (slug, name) VALUES
  ('track',          'Track'),
  ('swimming',       'Swimming'),
  ('field',          'Field'),
  ('football',       'Football'),
  ('basketball',     'Basketball'),
  ('racket_sports',  'Racket Sports'),
  ('volleyball',     'Volleyball'),
  ('weightlifting',  'Weightlifting'),
  ('cycling',        'Cycling'),
  ('rock_climbing',  'Rock Climbing'),
  ('golf',           'Golf'),
  ('footgolf',       'Footgolf'),
  ('archery',        'Archery'),
  ('table_tennis',   'Table Tennis'),
  ('flag_football',  'Flag Football'),
  ('other',          'Other')
ON CONFLICT (slug) DO NOTHING;