// Integration tests for social queries: feed, chat, DMs, notifications, conversations.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getFeed } from '../../src/queries/social/get-feed';
import { getGroupChat } from '../../src/queries/social/get-group-chat';
import { getDirectMessages } from '../../src/queries/social/get-direct-messages';
import { getNotifications } from '../../src/queries/social/get-notifications';
import { getConversations } from '../../src/queries/social/get-conversations';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let profileA: string;
let profileB: string;
let competitionId: string;
let feedItemId: string;

beforeAll(async () => {
  profileA = await createTestAuthUser(admin, `social-q-a-${Date.now()}`);
  profileB = await createTestAuthUser(admin, `social-q-b-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Social Query ${Date.now()}`, host_id: profileA, is_public: false, status: 'active', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  await admin.from('competition_members').insert([
    { competition_id: competitionId, profile_id: profileA, role: 'competitor', status: 'active' },
    { competition_id: competitionId, profile_id: profileB, role: 'competitor', status: 'active' },
  ]);

  // Seed activity feed items
  const { data: fi } = await admin
    .from('activity_feed')
    .insert({ competition_id: competitionId, event_type: 'member_joined', actor_profile_id: profileA, subject_profile_id: profileB })
    .select()
    .single();
  feedItemId = (fi as { id: string }).id;

  await admin
    .from('activity_feed')
    .insert({ competition_id: competitionId, event_type: 'result_confirmed', actor_profile_id: profileB, subject_profile_id: profileA });

  // Group chat messages
  await admin.from('messages').insert([
    { competition_id: competitionId, sender_profile_id: profileA, message_type: 'group_chat', content: 'Hello!' },
    { competition_id: competitionId, sender_profile_id: profileB, message_type: 'group_chat', content: 'Hey there!' },
  ]);

  // Direct messages
  await admin.from('messages').insert([
    { sender_profile_id: profileA, recipient_profile_id: profileB, message_type: 'direct_message', content: 'DM from A' },
    { sender_profile_id: profileB, recipient_profile_id: profileA, message_type: 'direct_message', content: 'DM from B' },
  ]);

  // Notifications
  await admin.from('notifications').insert([
    { profile_id: profileA, type: 'result_confirmed', title: 'Result confirmed', body: 'Your result was confirmed', read_at: null },
    { profile_id: profileA, type: 'mvp_awarded', title: 'MVP!', body: 'You won MVP', read_at: new Date().toISOString() },
  ]);
});

afterAll(async () => {
  await admin.from('feed_comments').delete().eq('feed_item_id', feedItemId);
  await admin.from('activity_feed').delete().eq('competition_id', competitionId);
  await admin.from('messages').delete().eq('competition_id', competitionId);
  await admin.from('messages').delete().or(`sender_profile_id.eq.${profileA},sender_profile_id.eq.${profileB}`);
  await admin.from('notifications').delete().eq('profile_id', profileA);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, profileA);
  await deleteTestAuthUser(admin, profileB);
});

describe('getFeed', () => {
  it('returns feed items for the competition newest-first', async () => {
    const result = await getFeed(admin, competitionId);
    expect(result.error).toBeNull();
    const items = result.data ?? [];
    expect(items.length).toBeGreaterThanOrEqual(2);
    // Verify descending order
    if (items.length >= 2) {
      const t1 = new Date((items[0] as { created_at: string }).created_at).getTime();
      const t2 = new Date((items[1] as { created_at: string }).created_at).getTime();
      expect(t1).toBeGreaterThanOrEqual(t2);
    }
  });

  it('embeds actor and subject profile data', async () => {
    const result = await getFeed(admin, competitionId);
    const item = (result.data ?? [])[0] as { actor: { id: string } | null } | undefined;
    expect(item?.actor?.id).toBeTruthy();
  });

  it('paginates: limit=1 sets hasMore=true when more items exist', async () => {
    const result = await getFeed(admin, competitionId, { limit: 1 });
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBeTruthy();
  });

  it('cursor-based pagination returns next page', async () => {
    const page1 = await getFeed(admin, competitionId, { limit: 1 });
    const page2 = await getFeed(admin, competitionId, { limit: 1, ...(page1.nextCursor ? { cursor: page1.nextCursor } : {}) });
    expect(page2.error).toBeNull();
    const p1Id = ((page1.data ?? [])[0] as { id: string })?.id;
    const p2Id = ((page2.data ?? [])[0] as { id: string })?.id;
    expect(p1Id).not.toBe(p2Id);
  });
});

describe('getGroupChat', () => {
  it('returns non-deleted group chat messages for the competition', async () => {
    const result = await getGroupChat(admin, competitionId);
    expect(result.error).toBeNull();
    const messages = result.data ?? [];
    expect(messages.length).toBeGreaterThanOrEqual(2);
    expect(messages.every((m: unknown) => (m as { message_type: string }).message_type === 'group_chat')).toBe(true);
  });

  it('excludes soft-deleted messages', async () => {
    const { data: deletedMsg } = await admin
      .from('messages')
      .insert({ competition_id: competitionId, sender_profile_id: profileA, message_type: 'group_chat', content: '[deleted]', deleted_at: new Date().toISOString() })
      .select()
      .single();

    const result = await getGroupChat(admin, competitionId);
    const ids = (result.data ?? []).map((m: unknown) => (m as { id: string }).id);
    expect(ids).not.toContain((deletedMsg as { id: string }).id);

    await admin.from('messages').delete().eq('id', (deletedMsg as { id: string }).id);
  });

  it('embeds sender profile on each message', async () => {
    const result = await getGroupChat(admin, competitionId);
    const msg = (result.data ?? [])[0] as { sender: { id: string } | null } | undefined;
    expect(msg?.sender?.id).toBeTruthy();
  });
});

describe('getDirectMessages', () => {
  it('returns DMs between two profiles in both directions', async () => {
    const result = await getDirectMessages(admin, profileA, profileB);
    expect(result.error).toBeNull();
    const messages = result.data ?? [];
    expect(messages.length).toBeGreaterThanOrEqual(2);
  });

  it('returns the same messages when argument order is reversed', async () => {
    const ab = await getDirectMessages(admin, profileA, profileB);
    const ba = await getDirectMessages(admin, profileB, profileA);
    expect((ab.data ?? []).length).toBe((ba.data ?? []).length);
  });

  it('returns empty array for two users with no DM history', async () => {
    const newUser = await createTestAuthUser(admin, `dm-stranger-${Date.now()}`);
    const result = await getDirectMessages(admin, profileA, newUser);
    expect(result.data?.length).toBe(0);
    await deleteTestAuthUser(admin, newUser);
  });
});

describe('getNotifications', () => {
  it('returns all notifications for the profile', async () => {
    const result = await getNotifications(admin, profileA);
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('filters to unread-only when unreadOnly=true', async () => {
    const result = await getNotifications(admin, profileA, { unreadOnly: true });
    const notifications = result.data ?? [];
    expect(notifications.every((n: unknown) => (n as { read_at: string | null }).read_at === null)).toBe(true);
  });

  it('paginates with cursor', async () => {
    const page1 = await getNotifications(admin, profileA, { limit: 1 });
    expect(page1.hasMore).toBe(true);
    const page2 = await getNotifications(admin, profileA, { limit: 1, ...(page1.nextCursor ? { cursor: page1.nextCursor } : {}) });
    expect(page2.error).toBeNull();
  });
});

describe('getConversations', () => {
  it('returns one entry per unique DM partner', async () => {
    const result = await getConversations(admin, profileA);
    expect(result.error).toBeNull();
    const conversations = result.data ?? [];
    expect(conversations.length).toBeGreaterThanOrEqual(1);
  });

  it('deduplicated: multiple messages with same partner only yields one entry', async () => {
    const result = await getConversations(admin, profileA);
    const seen = new Set<string>();
    for (const conv of result.data ?? []) {
      const m = conv as { sender_profile_id: string; recipient_profile_id: string };
      const partnerId = m.sender_profile_id === profileA ? m.recipient_profile_id : m.sender_profile_id;
      expect(seen.has(partnerId)).toBe(false);
      seen.add(partnerId);
    }
  });
});
