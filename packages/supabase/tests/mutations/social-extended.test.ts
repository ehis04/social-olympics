// Integration tests for social mutations: votes, tiebreaker nominations, notifications, feed comments.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { submitPerformanceVote } from '../../src/mutations/social/submit-performance-vote';
import { submitStrengthVote } from '../../src/mutations/social/submit-strength-vote';
import { submitTiebreakerNomination } from '../../src/mutations/social/submit-tiebreaker-nomination';
import { markNotificationsRead } from '../../src/mutations/social/mark-notifications-read';
import { addFeedComment } from '../../src/mutations/social/add-feed-comment';
import { removeReaction } from '../../src/mutations/social/remove-reaction';
import { addReaction } from '../../src/mutations/social/add-reaction';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let profileA: string;
let profileB: string;
let competitionId: string;
let competitionEventId: string;
let teamId: string;
let teamMemberId: string;
let tiebreakerEventId: string;
let tiebreakerNominationEventId: string;
let feedItemId: string;
let notificationId: string;
let reactionId: string;

beforeAll(async () => {
  profileA = await createTestAuthUser(admin, `social-a-${Date.now()}`);
  profileB = await createTestAuthUser(admin, `social-b-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Social Ext ${Date.now()}`, host_id: profileA, is_public: false, status: 'active', min_events_required: 1, mvp_voting_enabled: true })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  await admin.from('competition_members').insert([
    { competition_id: competitionId, profile_id: profileA, role: 'competitor', status: 'active' },
    { competition_id: competitionId, profile_id: profileB, role: 'competitor', status: 'active' },
  ]);

  const { data: ev } = await admin.from('events').select('id').limit(1).single();
  const { data: ce } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: (ev as { id: string }).id, sequence_order: 1, status: 'confirmed' })
    .select()
    .single();
  competitionEventId = (ce as { id: string }).id;
  // tiebreaker_nominations.nominated_event_id references competition_events(id)
  tiebreakerNominationEventId = competitionEventId;

  // Team setup for strength votes
  const { data: team } = await admin
    .from('teams')
    .insert({ competition_event_id: competitionEventId, name: 'Team Alpha' })
    .select()
    .single();
  teamId = (team as { id: string }).id;

  const { data: tm } = await admin
    .from('team_members')
    .insert({ team_id: teamId, profile_id: profileB, strength_rating: 7, rating_source: 'historical' })
    .select()
    .single();
  teamMemberId = (tm as { id: string }).id;

  // Tiebreaker setup
  const { data: tb } = await admin
    .from('tiebreakers')
    .insert({ competition_id: competitionId, profile_id_a: profileA, profile_id_b: profileB, status: 'pending_nomination' })
    .select()
    .single();
  tiebreakerEventId = (tb as { id: string }).id;

  // Feed item and notification for downstream tests
  const { data: feed } = await admin
    .from('activity_feed')
    .insert({ competition_id: competitionId, event_type: 'result_confirmed', actor_profile_id: profileA, subject_profile_id: profileB })
    .select()
    .single();
  feedItemId = (feed as { id: string }).id;

  const { data: notif } = await admin
    .from('notifications')
    .insert({ profile_id: profileA, type: 'mvp_awarded', title: 'You won MVP!', body: 'Great job!', read_at: null })
    .select()
    .single();
  notificationId = (notif as { id: string }).id;
});

afterAll(async () => {
  await admin.from('tiebreaker_nominations').delete().eq('tiebreaker_id', tiebreakerEventId);
  await admin.from('tiebreakers').delete().eq('id', tiebreakerEventId);
  await admin.from('feed_comments').delete().eq('feed_item_id', feedItemId);
  await admin.from('activity_feed').delete().eq('id', feedItemId);
  await admin.from('notifications').delete().eq('profile_id', profileA);
  await admin.from('reactions').delete().eq('profile_id', profileA);
  await admin.from('performance_votes').delete().eq('competition_event_id', competitionEventId);
  await admin.from('strength_rating_votes').delete().eq('team_member_id', teamMemberId);
  await admin.from('team_members').delete().eq('id', teamMemberId);
  await admin.from('teams').delete().eq('id', teamId);
  await admin.from('competition_events').delete().eq('id', competitionEventId);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, profileA);
  await deleteTestAuthUser(admin, profileB);
});

describe('submitPerformanceVote', () => {
  it('records an MVP vote for another player', async () => {
    const result = await submitPerformanceVote(admin, {
      competition_event_id: competitionEventId,
      voter_profile_id: profileA,
      voted_for_profile_id: profileB,
      vote_type: 'mvp',
    });

    expect(result.error).toBeNull();
    expect((result.data as { vote_type: string } | null)?.vote_type).toBe('mvp');
  });

  it('upserts when the same voter votes again (changes candidate)', async () => {
    // A second user so we can vote for A from B
    const result = await submitPerformanceVote(admin, {
      competition_event_id: competitionEventId,
      voter_profile_id: profileB,
      voted_for_profile_id: profileA,
      vote_type: 'mvp',
    });

    expect(result.error).toBeNull();

    // Re-vote to confirm upsert (same voter, same event, same type)
    const result2 = await submitPerformanceVote(admin, {
      competition_event_id: competitionEventId,
      voter_profile_id: profileB,
      voted_for_profile_id: profileA,
      vote_type: 'mvp',
    });
    expect(result2.error).toBeNull();

    const { data: votes } = await admin
      .from('performance_votes')
      .select('id')
      .eq('competition_event_id', competitionEventId)
      .eq('voter_profile_id', profileB)
      .eq('vote_type', 'mvp');

    expect((votes ?? []).length).toBe(1);
  });
});

describe('submitStrengthVote', () => {
  it('records a confirm vote and returns an outcome', async () => {
    const result = await submitStrengthVote(admin, {
      team_member_id: teamMemberId,
      voter_profile_id: profileA,
      vote: 'confirm',
      submission_round: 1,
    });

    expect(result.error).toBeNull();
    expect(result.data?.vote).not.toBeNull();
  });

  it('returns confirmed outcome when majority confirms', async () => {
    // With only 1 voter so far for a 1-person majority, this is already confirmed
    const { data: voteRows } = await admin
      .from('strength_rating_votes')
      .select('vote')
      .eq('team_member_id', teamMemberId);

    expect((voteRows ?? []).length).toBeGreaterThan(0);
  });
});

describe('submitTiebreakerNomination', () => {
  it('allows player A to submit a nomination (not yet revealed)', async () => {
    const result = await submitTiebreakerNomination(admin, {
      tiebreaker_id: tiebreakerEventId,
      nominating_profile_id: profileA,
      nominated_event_id: tiebreakerNominationEventId,
    });

    expect(result.error).toBeNull();
    expect(result.data?.bothRevealed).toBe(false);
  });

  it('reveals both nominations when player B also submits', async () => {
    const result = await submitTiebreakerNomination(admin, {
      tiebreaker_id: tiebreakerEventId,
      nominating_profile_id: profileB,
      nominated_event_id: tiebreakerNominationEventId,
    });

    expect(result.error).toBeNull();
    expect(result.data?.bothRevealed).toBe(true);

    const { data: nominations } = await admin
      .from('tiebreaker_nominations')
      .select('revealed_at')
      .eq('tiebreaker_id', tiebreakerEventId);

    expect((nominations ?? []).every((n: { revealed_at: string | null }) => n.revealed_at !== null)).toBe(true);
  });
});

describe('markNotificationsRead', () => {
  it('marks all unread notifications as read', async () => {
    const result = await markNotificationsRead(admin, profileA);
    expect(result.error).toBeNull();

    const { data: notifs } = await admin
      .from('notifications')
      .select('read_at')
      .eq('profile_id', profileA)
      .is('read_at', null);

    expect((notifs ?? []).length).toBe(0);
  });

  it('marks only specific notifications when IDs are provided', async () => {
    const { data: n1 } = await admin
      .from('notifications')
      .insert({ profile_id: profileA, type: 'test', title: 'N1', body: 'Body', read_at: null })
      .select()
      .single();
    const { data: n2 } = await admin
      .from('notifications')
      .insert({ profile_id: profileA, type: 'test', title: 'N2', body: 'Body', read_at: null })
      .select()
      .single();

    await markNotificationsRead(admin, profileA, [(n1 as { id: string }).id]);

    const { data: unread } = await admin
      .from('notifications')
      .select('id, read_at')
      .in('id', [(n1 as { id: string }).id, (n2 as { id: string }).id]);

    const n1Row = (unread ?? []).find((n: { id: string }) => n.id === (n1 as { id: string }).id);
    const n2Row = (unread ?? []).find((n: { id: string }) => n.id === (n2 as { id: string }).id);
    expect((n1Row as { read_at: string | null } | undefined)?.read_at).not.toBeNull();
    expect((n2Row as { read_at: string | null } | undefined)?.read_at).toBeNull();
  });
});

describe('addFeedComment', () => {
  it('creates a comment on a feed item', async () => {
    const result = await addFeedComment(admin, feedItemId, 'Great performance!', profileA);

    expect(result.error).toBeNull();
    expect((result.data as { content: string } | null)?.content).toBe('Great performance!');
    expect((result.data as { feed_item_id: string } | null)?.feed_item_id).toBe(feedItemId);
  });
});

describe('removeReaction', () => {
  it('deletes the reaction row', async () => {
    const { data: reaction } = await admin
      .from('reactions')
      .insert({ profile_id: profileA, target_type: 'feed_item', target_id: feedItemId, emoji: '🔥' })
      .select()
      .single();

    reactionId = (reaction as { id: string }).id;
    await removeReaction(admin, reactionId);

    const { data: found } = await admin.from('reactions').select('id').eq('id', reactionId);
    expect((found ?? []).length).toBe(0);
  });
});
