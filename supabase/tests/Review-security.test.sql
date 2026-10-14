BEGIN;
SELECT plan(5);

INSERT INTO auth.users(id, email, encrypted_password, created_at, updated_at) VALUES
 ('40000000-0000-0000-0000-000000000001', 'review-host@test.com', 'x', now(), now()),
 ('40000000-0000-0000-0000-000000000002', 'review-member@test.com', 'x', now(), now()),
 ('40000000-0000-0000-0000-000000000003', 'review-outsider@test.com', 'x', now(), now());
INSERT INTO public.competitions(id, name, is_public, host_id, min_events_required) VALUES
 ('40000000-0000-0000-0000-000000000010', 'Review Private', false, '40000000-0000-0000-0000-000000000001', 1);
INSERT INTO public.competition_members(competition_id, profile_id, status, role) VALUES
 ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001', 'active', 'competitor'),
 ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000002', 'active', 'competitor');
INSERT INTO public.competition_events(id, competition_id, event_id, sequence_order, status) VALUES
 ('40000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000010',
  (SELECT id FROM public.events WHERE slug = '100m-sprint'), 1, 'active');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"40000000-0000-0000-0000-000000000003"}';
SELECT throws_like($$INSERT INTO public.competition_members(competition_id, profile_id, status, role)
 VALUES ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000003', 'active', 'competitor')$$,
 '%row-level security%', 'Cannot join a private competition directly by UUID');
SELECT throws_like($$SELECT public.increment_competition_total_events('40000000-0000-0000-0000-000000000010')$$,
 '%permission denied%', 'Internal score and counter functions cannot be invoked by clients');

SET LOCAL "request.jwt.claims" = '{"sub":"40000000-0000-0000-0000-000000000002"}';
SELECT throws_like($$INSERT INTO public.results(competition_event_id, profile_id, submitted_by, result_value_primary, confirmed_at, points_awarded)
 VALUES ('40000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 100, now(), 1000)$$,
 '%row-level security%', 'Competitor cannot award themselves confirmed points');
SELECT throws_like($$INSERT INTO public.results(competition_event_id, profile_id, submitted_by, result_value_primary)
 VALUES ('40000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 100)$$,
 '%row-level security%', 'Competitor cannot submit a result for another participant');
SELECT lives_ok($$INSERT INTO public.results(competition_event_id, profile_id, submitted_by, result_value_primary)
 VALUES ('40000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 100)$$,
 'Competitor can submit their own unconfirmed result');
RESET role;
SELECT * FROM finish();
ROLLBACK;
