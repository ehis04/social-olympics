-- supabase/tests/Triggers-extended.test.sql
-- Extended pgTAP tests for database triggers and functions

BEGIN;

SELECT plan(18);

SET LOCAL role = postgres;

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP: auth users and base data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'ext_trg_a@test.com', 'x', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'ext_trg_b@test.com', 'x', now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'ext_trg_c@test.com', 'x', now(), now());

INSERT INTO public.competitions (id, name, is_public, host_id, min_events_required, status)
VALUES ('20000000-0000-0000-0000-000000000010', 'Trigger Ext Comp', true,
        '20000000-0000-0000-0000-000000000001', 2, 'setup');

INSERT INTO public.competition_members (competition_id, profile_id, role, status, joined_at)
VALUES
  ('20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001', 'competitor', 'active', now()),
  ('20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'competitor', 'active', now()),
  ('20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000003', 'competitor', 'active', now());

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 1–2: career_stats row is created and initialized to zeros
-- ─────────────────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT total_points FROM public.career_stats
   WHERE profile_id = '20000000-0000-0000-0000-000000000001'),
  0::numeric,
  'career_stats.total_points initialised to 0'
);

SELECT is(
  (SELECT total_competitions FROM public.career_stats
   WHERE profile_id = '20000000-0000-0000-0000-000000000001'),
  0::bigint,
  'career_stats.total_competitions initialised to 0'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 3: total_events stays at 0 before any events are added
-- ─────────────────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT total_events FROM public.competitions
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'total_events is 0 before any events are added'
);

-- Add two events
INSERT INTO public.competition_events (id, competition_id, event_id, sequence_order, status)
VALUES
  ('20000000-0000-0000-0000-000000000020',
   '20000000-0000-0000-0000-000000000010',
   (SELECT id FROM public.events WHERE slug = '100m-sprint'),
   1, 'pending'),
  ('20000000-0000-0000-0000-000000000021',
   '20000000-0000-0000-0000-000000000010',
   (SELECT id FROM public.events WHERE slug = '100m-sprint'),
   2, 'pending');

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 4: total_events = 2 after two inserts
-- ─────────────────────────────────────────────────────────────────────────────

SELECT is(
  (SELECT total_events FROM public.competitions
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  2,
  'total_events = 2 after two competition_events inserts'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 5: total_events clamps to 0 (never goes negative) on over-deletion
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM public.competition_events WHERE id = '20000000-0000-0000-0000-000000000021';
DELETE FROM public.competition_events WHERE id = '20000000-0000-0000-0000-000000000020';

-- one extra call that would normally go to -1
PERFORM public.decrement_competition_total_events('20000000-0000-0000-0000-000000000010');

SELECT is(
  (SELECT total_events FROM public.competitions
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  0,
  'total_events cannot go below 0 (clamped by GREATEST)'
);

-- Re-add event for remaining trigger tests
INSERT INTO public.competition_events (id, competition_id, event_id, sequence_order, status)
VALUES (
  '20000000-0000-0000-0000-000000000020',
  '20000000-0000-0000-0000-000000000010',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  1, 'pending'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 6–7: Starting the first event sets competition → active and locks voting
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.competition_events SET status = 'active'
WHERE id = '20000000-0000-0000-0000-000000000020';

SELECT is(
  (SELECT status::text FROM public.competitions
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  'active',
  'Starting event transitions competition status to active'
);

SELECT is(
  (SELECT voting_locked FROM public.competitions
   WHERE id = '20000000-0000-0000-0000-000000000010'),
  true,
  'Starting event sets voting_locked = true'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 8–12: Confirm result → member scores and medal counts updated correctly
-- ─────────────────────────────────────────────────────────────────────────────

-- Insert results for two members
INSERT INTO public.results
  (id, competition_event_id, profile_id, is_dnf, finishing_place,
   result_value_primary, points_awarded, participation_points,
   submitted_by, submitted_at)
VALUES
  ('20000000-0000-0000-0000-000000000030',
   '20000000-0000-0000-0000-000000000020',
   '20000000-0000-0000-0000-000000000001',
   false, 1, 9.8, 10, 0.1,
   '20000000-0000-0000-0000-000000000001', now()),
  ('20000000-0000-0000-0000-000000000031',
   '20000000-0000-0000-0000-000000000020',
   '20000000-0000-0000-0000-000000000002',
   false, 2, 10.1, 7, 0.1,
   '20000000-0000-0000-0000-000000000002', now());

-- Confirm both results
UPDATE public.results
SET confirmed_at = now(), confirmed_by = '20000000-0000-0000-0000-000000000001'
WHERE id IN ('20000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000031');

SELECT is(
  (SELECT gold_count FROM public.competition_members
   WHERE competition_id = '20000000-0000-0000-0000-000000000010'
     AND profile_id = '20000000-0000-0000-0000-000000000001'),
  1,
  'First-place result increments gold_count'
);

SELECT is(
  (SELECT silver_count FROM public.competition_members
   WHERE competition_id = '20000000-0000-0000-0000-000000000010'
     AND profile_id = '20000000-0000-0000-0000-000000000002'),
  1,
  'Second-place result increments silver_count'
);

SELECT is(
  (SELECT total_points FROM public.competition_members
   WHERE competition_id = '20000000-0000-0000-0000-000000000010'
     AND profile_id = '20000000-0000-0000-0000-000000000001'),
  10.1::numeric,
  '1st place total_points = points_awarded + participation_points × weight'
);

SELECT is(
  (SELECT gold_count FROM public.competition_members
   WHERE competition_id = '20000000-0000-0000-0000-000000000010'
     AND profile_id = '20000000-0000-0000-0000-000000000002'),
  0,
  'Second-place member has 0 gold medals'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 13: DNF result does NOT increment gold_count
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.results
  (id, competition_event_id, profile_id, is_dnf, finishing_place,
   result_value_primary, points_awarded, participation_points,
   submitted_by, submitted_at)
VALUES
  ('20000000-0000-0000-0000-000000000032',
   '20000000-0000-0000-0000-000000000020',
   '20000000-0000-0000-0000-000000000003',
   true, 1, 0, 0, 0.1,
   '20000000-0000-0000-0000-000000000003', now());

UPDATE public.results
SET confirmed_at = now(), confirmed_by = '20000000-0000-0000-0000-000000000001'
WHERE id = '20000000-0000-0000-0000-000000000032';

SELECT is(
  (SELECT gold_count FROM public.competition_members
   WHERE competition_id = '20000000-0000-0000-0000-000000000010'
     AND profile_id = '20000000-0000-0000-0000-000000000003'),
  0,
  'DNF result does not increment gold_count even with finishing_place=1'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 14–15: update_personal_best logic
--   time result type → lower value is better
-- ─────────────────────────────────────────────────────────────────────────────

PERFORM public.update_personal_best(
  '20000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  9.8, NULL,
  '20000000-0000-0000-0000-000000000020',
  'time'
);

SELECT is(
  (SELECT result_value_primary FROM public.personal_bests
   WHERE profile_id = '20000000-0000-0000-0000-000000000001'),
  9.8::numeric,
  'update_personal_best inserts first PB correctly'
);

-- Better (lower) time should update
PERFORM public.update_personal_best(
  '20000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  9.5, NULL,
  '20000000-0000-0000-0000-000000000020',
  'time'
);

SELECT is(
  (SELECT result_value_primary FROM public.personal_bests
   WHERE profile_id = '20000000-0000-0000-0000-000000000001'),
  9.5::numeric,
  'update_personal_best replaces PB when new time is faster'
);

-- Worse (higher) time should NOT update
PERFORM public.update_personal_best(
  '20000000-0000-0000-0000-000000000001',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'),
  10.2, NULL,
  '20000000-0000-0000-0000-000000000020',
  'time'
);

SELECT is(
  (SELECT result_value_primary FROM public.personal_bests
   WHERE profile_id = '20000000-0000-0000-0000-000000000001'),
  9.5::numeric,
  'update_personal_best does not replace PB when new time is slower'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 18: career_stats updated after competition score changes
-- ─────────────────────────────────────────────────────────────────────────────

PERFORM public.update_career_stats('20000000-0000-0000-0000-000000000001');

SELECT ok(
  (SELECT total_points FROM public.career_stats
   WHERE profile_id = '20000000-0000-0000-0000-000000000001') > 0,
  'career_stats.total_points reflects confirmed results after update_career_stats call'
);

SELECT * FROM finish();

ROLLBACK;
