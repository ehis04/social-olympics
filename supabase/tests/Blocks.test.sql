BEGIN;
SELECT plan(6);

INSERT INTO auth.users(id, email, encrypted_password, created_at, updated_at) VALUES
 ('60000000-0000-0000-0000-000000000001', 'block-a@test.com', 'x', now(), now()),
 ('60000000-0000-0000-0000-000000000002', 'block-b@test.com', 'x', now(), now());
INSERT INTO public.competitions(id, name, is_public, host_id, min_events_required) VALUES
 ('60000000-0000-0000-0000-000000000010', 'Block Test', false, '60000000-0000-0000-0000-000000000001', 1);
INSERT INTO public.competition_members(competition_id, profile_id, status, role) VALUES
 ('60000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000001', 'active', 'competitor');

SET LOCAL role = authenticated;
SET LOCAL "request.jwt.claims" = '{"sub":"60000000-0000-0000-0000-000000000002"}';
SELECT throws_like($$INSERT INTO public.messages(sender_profile_id, competition_id, message_type, content)
 VALUES ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000010', 'group_chat', 'hi')$$,
 '%row-level security%', 'Non-members cannot post in a competition chat');
SELECT lives_ok($$INSERT INTO public.messages(sender_profile_id, recipient_profile_id, message_type, content)
 VALUES ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'direct_message', 'hello')$$,
 'Direct messages work when nobody is blocked');

SET LOCAL "request.jwt.claims" = '{"sub":"60000000-0000-0000-0000-000000000001"}';
SELECT lives_ok($$INSERT INTO public.profile_blocks(blocker_id, blocked_id)
 VALUES ('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002')$$,
 'A user can block another user');
SELECT throws_like($$INSERT INTO public.messages(sender_profile_id, recipient_profile_id, message_type, content)
 VALUES ('60000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'direct_message', 'hey')$$,
 '%row-level security%', 'The blocker cannot message the person they blocked');

SET LOCAL "request.jwt.claims" = '{"sub":"60000000-0000-0000-0000-000000000002"}';
SELECT throws_like($$INSERT INTO public.messages(sender_profile_id, recipient_profile_id, message_type, content)
 VALUES ('60000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'direct_message', 'again')$$,
 '%row-level security%', 'A blocked user cannot message the blocker');
SELECT is((SELECT count(*)::int FROM public.profile_blocks), 0, 'Blocks are private to the person who made them');
RESET role;
SELECT * FROM finish();
ROLLBACK;
