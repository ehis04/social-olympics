-- supabase/tests/triggers.test.sql
-- pgTAP tests for database triggers

BEGIN;

SELECT plan(7);

-- Setup: insert auth users directly as postgres role
SET LOCAL role = postgres;

INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'trigger_a@test.com', 'x', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'trigger_b@test.com', 'x', now(), now());

-- Test 1: Insert auth user → profile row auto-created (via handle_new_user trigger)
SELECT is(
  (SELECT COUNT(*)::integer FROM public.profiles
   WHERE id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Insert auth user creates profile row'
);

-- Test 2: Insert profile → career_stats row auto-created (via handle_new_profile trigger)
SELECT is(
  (SELECT COUNT(*)::integer FROM public.career_stats
   WHERE profile_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Insert profile creates career_stats row'
);

-- Setup competition and event for remaining trigger tests
INSERT INTO public.competitions (id, name, is_public, host_id, min_events_required, status)
VALUES ('10000000-0000-0000-0000-000000000010', 'Trigger Test Comp', true,
        '10000000-0000-0000-0000-000000000001', 1, 'setup');

INSERT INTO public.competition_members (competition_id, profile_id, role, status, joined_at)
VALUES
  ('10000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000001', 'competitor', 'active', now()),
  ('10000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000002', 'competitor', 'active', now());

-- Test 3: Add competition_event → competitions.total_events increments
INSERT INTO public.competition_events
  (id, competition_id, event_id, sequence_order, status)
VALUES (
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000010',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  1, 'pending'
);

SELECT is(
  (SELECT total_events FROM public.competitions
   WHERE id = '10000000-0000-0000-0000-000000000010'),
  1,
  'Add competition_event increments total_events'
);

-- Test 4: Remove competition_event → competitions.total_events decrements
DELETE FROM public.competition_events
WHERE id = '10000000-0000-0000-0000-000000000020';

SELECT is(
  (SELECT total_events FROM public.competitions
   WHERE id = '10000000-0000-0000-0000-000000000010'),
  0,
  'Remove competition_event decrements total_events'
);

-- Re-insert event for remaining tests
INSERT INTO public.competition_events
  (id, competition_id, event_id, sequence_order, status)
VALUES (
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000010',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  1, 'pending'
);

-- Test 5: Start first event → competition.status → 'active', voting_locked → true
UPDATE public.competition_events
SET status = 'active'
WHERE id = '10000000-0000-0000-0000-000000000020';

SELECT is(
  (SELECT status::text FROM public.competitions
   WHERE id = '10000000-0000-0000-0000-000000000010'),
  'active',
  'Start first event sets competition status to active'
);

SELECT is(
  (SELECT voting_locked FROM public.competitions
   WHERE id = '10000000-0000-0000-0000-000000000010'),
  true,
  'Start first event sets voting_locked to true'
);

-- Test 6: Confirm result → competition_members.gold_count updates correctly
INSERT INTO public.results
  (id, competition_event_id, profile_id, is_dnf, finishing_place,
   result_value_primary, points_awarded, participation_points,
   submitted_by, submitted_at)
VALUES (
  '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000001',
  false, 1, 11400, 10, 0.1,
  '10000000-0000-0000-0000-000000000001',
  now()
);

UPDATE public.results
SET confirmed_at = now(),
    confirmed_by = '10000000-0000-0000-0000-000000000001'
WHERE id = '10000000-0000-0000-0000-000000000030';

SELECT is(
  (SELECT gold_count FROM public.competition_members
   WHERE competition_id = '10000000-0000-0000-0000-000000000010'
     AND profile_id = '10000000-0000-0000-0000-000000000001'),
  1,
  'Confirm result with finishing_place=1 increments gold_count'
);

SELECT * FROM finish();

ROLLBACK;