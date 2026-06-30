-- supabase/tests/Rls-extended.test.sql
-- Extended pgTAP tests for Row Level Security edge cases

BEGIN;

SELECT plan(20);

-- ─────────────────────────────────────────────────────────────────────────────
-- SETUP
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = postgres;

INSERT INTO auth.users (id, email, encrypted_password, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'rls_host@test.com',     'x', now(), now()),
  ('30000000-0000-0000-0000-000000000002', 'rls_member@test.com',   'x', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'rls_spectator@test.com','x', now(), now()),
  ('30000000-0000-0000-0000-000000000004', 'rls_outsider@test.com', 'x', now(), now()),
  ('30000000-0000-0000-0000-000000000005', 'rls_cohost@test.com',   'x', now(), now());

-- Public competition
INSERT INTO public.competitions (id, name, is_public, host_id, cohost_id, min_events_required, status)
VALUES ('30000000-0000-0000-0000-000000000010', 'Public RLS Comp', true,
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000005', 1, 'active');

-- Private competition (host-only visible)
INSERT INTO public.competitions (id, name, is_public, host_id, min_events_required, status)
VALUES ('30000000-0000-0000-0000-000000000011', 'Private RLS Comp', false,
        '30000000-0000-0000-0000-000000000001', 1, 'setup');

INSERT INTO public.competition_members (competition_id, profile_id, role, status, joined_at)
VALUES
  ('30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', 'competitor', 'active', now()),
  ('30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000002', 'competitor', 'active', now()),
  ('30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000003', 'spectator',  'active', now()),
  ('30000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', 'competitor', 'active', now());

-- Event and competition_events for membership visibility tests
INSERT INTO public.events (id, category_id, name, slug, result_type)
VALUES ('30000000-0000-0000-0000-000000000020',
        (SELECT id FROM public.event_categories WHERE slug = 'track'),
        'RLS Test Event', 'rls-test-event', 'time');

INSERT INTO public.competition_events (id, competition_id, event_id, sequence_order, status)
VALUES ('30000000-0000-0000-0000-000000000030',
        '30000000-0000-0000-0000-000000000010',
        '30000000-0000-0000-0000-000000000020', 1, 'active');

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 1: Spectator member can read competition events
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000003"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competition_events
   WHERE competition_id = '30000000-0000-0000-0000-000000000010'),
  1,
  'Spectator can read competition events'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 2: Outsider cannot read events of a public competition (events are member-only)
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competition_events
   WHERE competition_id = '30000000-0000-0000-0000-000000000010'),
  0,
  'Non-member cannot read competition events even for a public competition'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 3: Host can see private competition
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competitions
   WHERE id = '30000000-0000-0000-0000-000000000011'),
  1,
  'Host can see their own private competition'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 4: Cohost can see the public competition
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000005"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competitions
   WHERE id = '30000000-0000-0000-0000-000000000010'),
  1,
  'Cohost can see the public competition'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 5: Member can read competition members list
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT ok(
  (SELECT COUNT(*)::integer FROM public.competition_members
   WHERE competition_id = '30000000-0000-0000-0000-000000000010') > 0,
  'Member can read competition members list'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 6: Non-member cannot read competition members list
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.competition_members
   WHERE competition_id = '30000000-0000-0000-0000-000000000010'),
  0,
  'Non-member cannot read competition members list'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 7: event_points_config global config readable by all authenticated users
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT ok(
  (SELECT COUNT(*)::integer FROM public.event_points_config WHERE competition_id IS NULL) > 0,
  'Authenticated user can read global event_points_config'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 8: Non-host cannot insert event_points_config for a competition
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT throws_ok(
  $$INSERT INTO public.event_points_config (competition_id, finishing_place, points_value)
    VALUES ('30000000-0000-0000-0000-000000000010', 99, 5)$$,
  'new row violates row-level security policy for table "event_points_config"',
  'Non-host cannot insert event_points_config for a competition'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 9: User can read only their own notifications
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = postgres;
INSERT INTO public.notifications (id, profile_id, type, title, body)
VALUES
  ('30000000-0000-0000-0000-000000000050', '30000000-0000-0000-0000-000000000001', 'result_confirmed', 'Result!', 'Body'),
  ('30000000-0000-0000-0000-000000000051', '30000000-0000-0000-0000-000000000002', 'result_confirmed', 'Result!', 'Body');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.notifications
   WHERE id IN ('30000000-0000-0000-0000-000000000050','30000000-0000-0000-0000-000000000051')),
  1,
  'User can only see their own notifications'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 10: User cannot delete another user's notification
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
DELETE FROM public.notifications WHERE id = '30000000-0000-0000-0000-000000000051';
RESET role;

SET LOCAL role = postgres;
SELECT is(
  (SELECT COUNT(*)::integer FROM public.notifications
   WHERE id = '30000000-0000-0000-0000-000000000051'),
  1,
  'User cannot delete another user''s notification'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 11–12: Messages RLS — group chat only visible to members
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = postgres;
INSERT INTO public.messages (id, competition_id, sender_profile_id, message_type, content)
VALUES ('30000000-0000-0000-0000-000000000060',
        '30000000-0000-0000-0000-000000000010',
        '30000000-0000-0000-0000-000000000001',
        'group_chat', 'Hello team!');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.messages
   WHERE id = '30000000-0000-0000-0000-000000000060'),
  1,
  'Competition member can read group chat message'
);
RESET role;

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.messages
   WHERE id = '30000000-0000-0000-0000-000000000060'),
  0,
  'Non-member cannot read group chat message'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 13–14: Direct message RLS
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = postgres;
INSERT INTO public.messages (id, sender_profile_id, recipient_profile_id, message_type, content)
VALUES ('30000000-0000-0000-0000-000000000061',
        '30000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000002',
        'direct_message', 'Hey!');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.messages
   WHERE id = '30000000-0000-0000-0000-000000000061'),
  1,
  'Sender can read their own DM'
);
RESET role;

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.messages
   WHERE id = '30000000-0000-0000-0000-000000000061'),
  0,
  'Unrelated third party cannot read a DM'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 15: Results — member can see results for their competition event
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = postgres;
INSERT INTO public.results (id, competition_event_id, profile_id, is_dnf,
  result_value_primary, submitted_by, submitted_at)
VALUES ('30000000-0000-0000-0000-000000000070',
        '30000000-0000-0000-0000-000000000030',
        '30000000-0000-0000-0000-000000000001',
        false, 9.9,
        '30000000-0000-0000-0000-000000000001', now());

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.results
   WHERE id = '30000000-0000-0000-0000-000000000070'),
  1,
  'Competition member can read results for their event'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 16: Non-member cannot see results
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000004"}';
SELECT is(
  (SELECT COUNT(*)::integer FROM public.results
   WHERE id = '30000000-0000-0000-0000-000000000070'),
  0,
  'Non-member cannot read competition results'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 17: User can report (reporter_profile_id must equal auth.uid)
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT lives_ok(
  $$INSERT INTO public.reports (reporter_profile_id, target_type, target_id, reason)
    VALUES (
      '30000000-0000-0000-0000-000000000002',
      'profile',
      '30000000-0000-0000-0000-000000000004',
      'Harassment towards other members'
    )$$,
  'Authenticated user can submit a report with their own profile id'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 18: User cannot report on behalf of another user
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000002"}';
SELECT throws_ok(
  $$INSERT INTO public.reports (reporter_profile_id, target_type, target_id, reason)
    VALUES (
      '30000000-0000-0000-0000-000000000004',
      'profile',
      '30000000-0000-0000-0000-000000000003',
      'Impersonation of another reporter'
    )$$,
  'new row violates row-level security policy for table "reports"',
  'User cannot submit a report on behalf of another user'
);
RESET role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST 19–20: Worst-performer vote — self-vote blocked (no_self_mvp CHECK on vote_type)
-- ─────────────────────────────────────────────────────────────────────────────

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
SELECT throws_like(
  $$INSERT INTO public.performance_votes
      (competition_event_id, voter_profile_id, voted_for_profile_id, vote_type)
    VALUES (
      '30000000-0000-0000-0000-000000000030',
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'worst_performer'
    )$$,
  '%no_self_mvp%',
  'User cannot vote for themselves as worst_performer'
);
RESET role;

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "30000000-0000-0000-0000-000000000001"}';
SELECT lives_ok(
  $$INSERT INTO public.performance_votes
      (competition_event_id, voter_profile_id, voted_for_profile_id, vote_type)
    VALUES (
      '30000000-0000-0000-0000-000000000030',
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      'worst_performer'
    )$$,
  'User can vote for someone else as worst_performer'
);
RESET role;

SELECT * FROM finish();

ROLLBACK;
