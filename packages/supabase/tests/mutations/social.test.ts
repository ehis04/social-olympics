// Integration tests for social mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sendMessage } from '../../src/mutations/social/send-message';
import { deleteMessage } from '../../src/mutations/social/delete-message';
import { addReaction } from '../../src/mutations/social/add-reaction';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let profileId: string;
let competitionId: string;
let messageId: string;

beforeAll(async () => {
  profileId = await createTestAuthUser(admin, `social-test-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({
      name: `Social Test ${Date.now()}`,
      host_id: profileId,
      is_public: false,
      status: 'active',
      min_events_required: 1,
    })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  await admin
    .from('competition_members')
    .insert({ competition_id: competitionId, profile_id: profileId, role: 'competitor' });
});

afterAll(async () => {
  await admin.from('reactions').delete().eq('profile_id', profileId);
  await admin.from('messages').delete().eq('competition_id', competitionId);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, profileId);
});

describe('sendMessage', () => {
  it('creates a group chat message with correct competition_id', async () => {
    const result = await sendMessage(admin, {
      sender_profile_id: profileId,
      competition_id: competitionId,
      message_type: 'group_chat',
      content: 'Hello world',
    });

    expect(result.error).toBeNull();
    expect((result.data as { competition_id: string } | null)?.competition_id).toBe(competitionId);
    messageId = (result.data as { id: string }).id;
  });
});

describe('deleteMessage', () => {
  it('soft-deletes: content becomes [deleted] and row is preserved', async () => {
    await deleteMessage(admin, messageId);

    const { data: msg } = await admin
      .from('messages')
      .select('content, deleted_at')
      .eq('id', messageId)
      .single();

    const m = msg as { content: string; deleted_at: string | null } | null;
    expect(m?.content).toBe('[deleted]');
    expect(m?.deleted_at).not.toBeNull();
  });
});

describe('addReaction', () => {
  it('creates a reaction successfully', async () => {
    const result = await addReaction(admin, {
      profile_id: profileId,
      target_type: 'message',
      target_id: messageId,
      emoji: '👍',
    });

    expect(result.error).toBeNull();
  });

  it('duplicate reaction upsert does not create a second row', async () => {
    await addReaction(admin, {
      profile_id: profileId,
      target_type: 'message',
      target_id: messageId,
      emoji: '👍',
    });

    const { data: reactions } = await admin
      .from('reactions')
      .select('id')
      .eq('profile_id', profileId)
      .eq('target_id', messageId)
      .eq('emoji', '👍');

    expect((reactions ?? []).length).toBe(1);
  });
});
