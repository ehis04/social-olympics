BEGIN;
SELECT plan(4);

INSERT INTO auth.users(id, email, encrypted_password, created_at, updated_at) VALUES
 ('50000000-0000-0000-0000-000000000001', 'suspended@test.com', 'x', now(), now()),
 ('50000000-0000-0000-0000-000000000002', 'bystander@test.com', 'x', now(), now());
INSERT INTO public.profile_suspensions(profile_id, reason) VALUES
 ('50000000-0000-0000-0000-000000000001', 'Test suspension');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"50000000-0000-0000-0000-000000000001"}';
SELECT is((SELECT count(*)::int FROM public.profile_suspensions), 1, 'A suspended user can see their own suspension');
SELECT throws_like($$DELETE FROM public.profile_suspensions WHERE profile_id = '50000000-0000-0000-0000-000000000001'$$,
 '%permission denied%', 'A suspended user cannot lift their own suspension');

SET LOCAL "request.jwt.claims" = '{"sub":"50000000-0000-0000-0000-000000000002"}';
SELECT is((SELECT count(*)::int FROM public.profile_suspensions), 0, 'Other users cannot see suspensions');
SELECT throws_like($$INSERT INTO public.profile_suspensions(profile_id) VALUES ('50000000-0000-0000-0000-000000000001')$$,
 '%permission denied%', 'Users cannot suspend each other');
RESET role;
SELECT * FROM finish();
ROLLBACK;
