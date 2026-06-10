-- Migration 00021: seed all system events (permanent data migration)

INSERT INTO public.events (category_id, name, slug, result_type, is_team_event, min_team_size, max_team_size, similarity_group) VALUES

  -- TRACK (8 events, result_type=time)
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '100m Sprint',    '100m-sprint',      'time', false, NULL, NULL, 'sprint'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '200m Sprint',    '200m-sprint',      'time', false, NULL, NULL, 'sprint'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '400m',           '400m',             'time', false, NULL, NULL, 'middle_distance'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '800m',           '800m',             'time', false, NULL, NULL, 'middle_distance'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '100m Hurdles',   '100m-hurdles',     'time', false, NULL, NULL, 'sprint'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '400m Hurdles',   '400m-hurdles',     'time', false, NULL, NULL, 'middle_distance'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '4×100m Relay',   '4x100m-relay',     'time', true,  4,    4,    'sprint'),
  ((SELECT id FROM public.event_categories WHERE slug = 'track'), '4×400m Relay',   '4x400m-relay',     'time', true,  4,    4,    'middle_distance'),

  -- SWIMMING (5 events, result_type=time)
  ((SELECT id FROM public.event_categories WHERE slug = 'swimming'), '25m Swim',           '25m-swim',          'time', false, NULL, NULL, 'swimming'),
  ((SELECT id FROM public.event_categories WHERE slug = 'swimming'), '50m Swim',           '50m-swim',          'time', false, NULL, NULL, 'swimming'),
  ((SELECT id FROM public.event_categories WHERE slug = 'swimming'), '100m Swim',          '100m-swim',         'time', false, NULL, NULL, 'swimming'),
  ((SELECT id FROM public.event_categories WHERE slug = 'swimming'), '4×50m Relay',        '4x50m-relay',       'time', true,  4,    4,    'swimming'),
  ((SELECT id FROM public.event_categories WHERE slug = 'swimming'), '4×100m Swim Relay',  '4x100m-swim-relay', 'time', true,  4,    4,    'swimming'),

  -- FIELD (5 events, result_type=distance)
  ((SELECT id FROM public.event_categories WHERE slug = 'field'), 'High Jump',     'high-jump',     'distance', false, NULL, NULL, 'field_jumps'),
  ((SELECT id FROM public.event_categories WHERE slug = 'field'), 'Long Jump',     'long-jump',     'distance', false, NULL, NULL, 'field_jumps'),
  ((SELECT id FROM public.event_categories WHERE slug = 'field'), 'Triple Jump',   'triple-jump',   'distance', false, NULL, NULL, 'field_jumps'),
  ((SELECT id FROM public.event_categories WHERE slug = 'field'), 'Discus Throw',  'discus-throw',  'distance', false, NULL, NULL, 'field_throws'),
  ((SELECT id FROM public.event_categories WHERE slug = 'field'), 'Hammer Throw',  'hammer-throw',  'distance', false, NULL, NULL, 'field_throws'),

  -- FOOTBALL (6 events)
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 1v1', 'football-1v1', 'possession', true, 1, 1, 'football'),
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 2v2', 'football-2v2', 'score',      true, 2, 2, 'football'),
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 3v3', 'football-3v3', 'score',      true, 3, 3, 'football'),
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 4v4', 'football-4v4', 'score',      true, 4, 4, 'football'),
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 5v5', 'football-5v5', 'score',      true, 5, 5, 'football'),
  ((SELECT id FROM public.event_categories WHERE slug = 'football'), 'Football 6v6', 'football-6v6', 'score',      true, 6, 6, 'football'),

  -- BASKETBALL (5 events)
  ((SELECT id FROM public.event_categories WHERE slug = 'basketball'), 'Basketball 1v1', 'basketball-1v1', 'possession', true, 1, 1, 'basketball'),
  ((SELECT id FROM public.event_categories WHERE slug = 'basketball'), 'Basketball 2v2', 'basketball-2v2', 'score',      true, 2, 2, 'basketball'),
  ((SELECT id FROM public.event_categories WHERE slug = 'basketball'), 'Basketball 3v3', 'basketball-3v3', 'score',      true, 3, 3, 'basketball'),
  ((SELECT id FROM public.event_categories WHERE slug = 'basketball'), 'Basketball 4v4', 'basketball-4v4', 'score',      true, 4, 4, 'basketball'),
  ((SELECT id FROM public.event_categories WHERE slug = 'basketball'), 'Basketball 5v5', 'basketball-5v5', 'score',      true, 5, 5, 'basketball'),

  -- RACKET SPORTS (6 events, result_type=score)
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Tennis 1v1',    'tennis-1v1',    'score', true, 1, 1, 'racket_sports'),
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Tennis 2v2',    'tennis-2v2',    'score', true, 2, 2, 'racket_sports'),
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Badminton 1v1', 'badminton-1v1', 'score', true, 1, 1, 'racket_sports'),
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Badminton 2v2', 'badminton-2v2', 'score', true, 2, 2, 'racket_sports'),
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Paddle 1v1',    'paddle-1v1',    'score', true, 1, 1, 'racket_sports'),
  ((SELECT id FROM public.event_categories WHERE slug = 'racket_sports'), 'Paddle 2v2',    'paddle-2v2',    'score', true, 2, 2, 'racket_sports'),

  -- VOLLEYBALL (2 events, result_type=score)
  ((SELECT id FROM public.event_categories WHERE slug = 'volleyball'), 'Volleyball 6v6',       'volleyball-6v6',       'score', true, 6, 6, 'volleyball'),
  ((SELECT id FROM public.event_categories WHERE slug = 'volleyball'), 'Volleyball 2v2 Beach', 'volleyball-2v2-beach', 'score', true, 2, 2, 'volleyball'),

  -- WEIGHTLIFTING (6 events)
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Bench Press (Max)',   'bench-press-max',  'weight',   false, NULL, NULL, 'weightlifting'),
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Bench Press (Reps)',  'bench-press-reps', 'compound', false, NULL, NULL, 'weightlifting'),
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Deadlift (Max)',      'deadlift-max',     'weight',   false, NULL, NULL, 'weightlifting'),
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Deadlift (Reps)',     'deadlift-reps',    'compound', false, NULL, NULL, 'weightlifting'),
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Barbell Squat (Max)', 'squat-max',        'weight',   false, NULL, NULL, 'weightlifting'),
  ((SELECT id FROM public.event_categories WHERE slug = 'weightlifting'), 'Barbell Squat (Reps)','squat-reps',       'compound', false, NULL, NULL, 'weightlifting'),

  -- CYCLING (2 events, result_type=time)
  ((SELECT id FROM public.event_categories WHERE slug = 'cycling'), 'Cycling Race', 'cycling-race',          'time', false, NULL, NULL, 'cycling'),
  ((SELECT id FROM public.event_categories WHERE slug = 'cycling'), 'Time Trial',   'individual-time-trial', 'time', false, NULL, NULL, 'cycling'),

  -- ROCK CLIMBING (2 events)
  ((SELECT id FROM public.event_categories WHERE slug = 'rock_climbing'), 'Rock Climbing Speed',      'rock-climbing-speed', 'time',  false, NULL, NULL, NULL),
  ((SELECT id FROM public.event_categories WHERE slug = 'rock_climbing'), 'Rock Climbing Difficulty', 'rock-climbing-diff',  'score', false, NULL, NULL, NULL),

  -- GOLF (1 event, result_type=inverted_score)
  ((SELECT id FROM public.event_categories WHERE slug = 'golf'), 'Golf', 'golf', 'inverted_score', false, NULL, NULL, NULL),

  -- FOOTGOLF (1 event, result_type=inverted_score)
  ((SELECT id FROM public.event_categories WHERE slug = 'footgolf'), 'Footgolf', 'footgolf', 'inverted_score', false, NULL, NULL, NULL),

  -- ARCHERY (1 event, result_type=score)
  ((SELECT id FROM public.event_categories WHERE slug = 'archery'), 'Archery', 'archery', 'score', false, NULL, NULL, NULL),

  -- TABLE TENNIS (1 event, result_type=score)
  ((SELECT id FROM public.event_categories WHERE slug = 'table_tennis'), 'Table Tennis', 'table-tennis', 'score', true, 1, 1, NULL),

  -- FLAG FOOTBALL (1 event, result_type=score)
  ((SELECT id FROM public.event_categories WHERE slug = 'flag_football'), 'Flag Football', 'flag-football', 'score', true, 7, 7, NULL)

ON CONFLICT (slug) DO NOTHING;