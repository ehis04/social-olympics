-- supabase/tests/rls.test.sql
-- pgTAP tests for Row Level Security policies

BEGIN;

SELECT plan(10);

-- Test 1: Unauthenticated user cannot read profiles
SET LOCAL role = anon;
SELECT is(
  (SELECT COUNT(*)::integer FROM public.profiles),
  0,
  'Unauthenticated user cannot read profiles'
);
RESET role;

-- Test 2: User A cannot see private competition of User B
-- Setup test users (handle_new_user trigger auto-creates profiles)
SET LOCAL role = postgres;
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'user_a@test.com', 'x', now(), now()),
  ('00000000-0000-0000-0000-000000000002', 'user_b@test.com', 'x', now(), now());

INSERT INTO public.competitions (id, name, is_public, host_id, min_events_required, status)
VALUES ('00000000-0000-0000-0000-000000000010', 'Private Comp', false,
        '00000000-0000-0000-0000-000000000002', 1, 'setup');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competitions
   WHERE id = '00000000-0000-0000-0000-000000000010'),
  0,
  'User A cannot see private competition of User B'
);
RESET role;

-- Test 3: User A can see public competition of User B
SET LOCAL role = postgres;
INSERT INTO public.competitions (id, name, is_public, host_id, min_events_required, status)
VALUES ('00000000-0000-0000-0000-000000000011', 'Public Comp', true,
        '00000000-0000-0000-0000-000000000002', 1, 'setup');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competitions
   WHERE id = '00000000-0000-0000-0000-000000000011'),
  1,
  'User A can see public competition of User B'
);
RESET role;

-- Test 4: Member can see their competition events
SET LOCAL role = postgres;
INSERT INTO public.competition_members (competition_id, profile_id, role, status, joined_at)
VALUES ('00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001', 'competitor', 'active', now());

INSERT INTO public.events (id, category_id, name, slug, result_type)
VALUES ('00000000-0000-0000-0000-000000000020',
        (SELECT id FROM public.event_categories WHERE slug = 'track'),
        'Test Event', 'test-event-rls', 'time');

INSERT INTO public.competition_events
  (id, competition_id, event_id, sequence_order, status)
VALUES ('00000000-0000-0000-0000-000000000030',
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000020', 1, 'pending');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competition_events
   WHERE id = '00000000-0000-0000-0000-000000000030'),
  1,
  'Member can see their competition events'
);
RESET role;

-- Test 5: Non-member cannot see competition events
-- User C is a third user who is not a member of the public competition
SET LOCAL role = postgres;
INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000003', 'user_c@test.com', 'x', now(), now());

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000003"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competition_events
   WHERE competition_id = '00000000-0000-0000-0000-000000000011'),
  0,
  'Non-member cannot see competition events'
);
RESET role;

-- Test 6: User can update their own profile
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
UPDATE public.profiles SET bio = 'Updated bio'
WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT is(
  (SELECT bio FROM public.profiles
   WHERE id = '00000000-0000-0000-0000-000000000001'),
  'Updated bio',
  'User can update their own profile'
);
RESET role;

-- Test 7: User cannot update another user's profile
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
UPDATE public.profiles SET bio = 'Hacked'
WHERE id = '00000000-0000-0000-0000-000000000002';
SELECT is(
  (SELECT bio FROM public.profiles
   WHERE id = '00000000-0000-0000-0000-000000000002'),
  NULL,
  'User cannot update another user profile'
);
RESET role;

-- Test 8: User cannot insert activity_feed directly (service_role only)
SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT throws_ok(
  $$INSERT INTO public.activity_feed (competition_id, event_type)
    VALUES ('00000000-0000-0000-0000-000000000011', 'test')$$,
  'new row violates row-level security policy for table "activity_feed"',
  'User cannot insert activity_feed directly'
);
RESET role;

-- Test 9: MVP vote — user cannot vote for themselves
SET LOCAL role = postgres;
INSERT INTO public.competition_members (competition_id, profile_id, role, status, joined_at)
VALUES ('00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000002', 'competitor', 'active', now())
ON CONFLICT DO NOTHING;

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT throws_like(
  $$INSERT INTO public.performance_votes
      (competition_event_id, voter_profile_id, voted_for_profile_id, vote_type)
    VALUES (
      '00000000-0000-0000-0000-000000000030',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000001',
      'mvp'
    )$$,
  '%no_self_mvp%',
  'User cannot vote for themselves for MVP'
);
RESET role;

-- Test 10: Tiebreaker nomination — user cannot see other player's sealed nomination
SET LOCAL role = postgres;
INSERT INTO public.tiebreakers
  (id, competition_id, profile_id_a, profile_id_b, status)
VALUES (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'pending_nomination'
);

INSERT INTO public.tiebreaker_nominations
  (tiebreaker_id, nominating_profile_id, nominated_event_id, revealed_at)
VALUES (
  '00000000-0000-0000-0000-000000000040',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000030',
  NULL
);

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.tiebreaker_nominations
   WHERE tiebreaker_id = '00000000-0000-0000-0000-000000000040'
     AND nominating_profile_id = '00000000-0000-0000-0000-000000000002'
     AND revealed_at IS NULL),
  0,
  'User cannot see other player sealed tiebreaker nomination'
);
RESET role;

SELECT * FROM finish();

ROLLBACK;