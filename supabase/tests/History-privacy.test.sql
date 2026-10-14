BEGIN;
SELECT plan(2);
INSERT INTO auth.users(id,email,encrypted_password,email_confirmed_at,created_at,updated_at) VALUES
 ('35000000-0000-0000-0000-000000000001','history-owner@example.test','x',now(),now(),now()),
 ('35000000-0000-0000-0000-000000000002','history-viewer@example.test','x',now(),now(),now());
INSERT INTO competitions(id,name,host_id,is_public,status,min_events_required) VALUES
 ('35000000-0000-0000-0000-000000000010','Private history fixture','35000000-0000-0000-0000-000000000001',false,'complete',1),
 ('35000000-0000-0000-0000-000000000011','Public history fixture','35000000-0000-0000-0000-000000000001',true,'active',1);
INSERT INTO competition_members(competition_id,profile_id,role,status) VALUES
 ('35000000-0000-0000-0000-000000000010','35000000-0000-0000-0000-000000000001','competitor','active'),
 ('35000000-0000-0000-0000-000000000011','35000000-0000-0000-0000-000000000001','competitor','active');
SET LOCAL role=authenticated;
SET LOCAL "request.jwt.claims"='{"sub":"35000000-0000-0000-0000-000000000002"}';
SELECT is((SELECT count(*)::integer FROM competition_members cm JOIN competitions c ON c.id=cm.competition_id
 WHERE cm.profile_id='35000000-0000-0000-0000-000000000001'),1,
 'Other viewers see public history without exposing private completed competitions');
SET LOCAL "request.jwt.claims"='{"sub":"35000000-0000-0000-0000-000000000001"}';
SELECT is((SELECT count(*)::integer FROM competition_members cm JOIN competitions c ON c.id=cm.competition_id
 WHERE cm.profile_id='35000000-0000-0000-0000-000000000001'),2,
 'Profile owner sees public and private competition history');
RESET role;
SELECT * FROM finish();
ROLLBACK;
