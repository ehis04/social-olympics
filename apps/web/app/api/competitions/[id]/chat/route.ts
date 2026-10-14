/*
 * This file handles requests for the chat API route.
 */

// GET/POST/DELETE /api/competitions/[id]/chat — group chat messages
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getGroupChat, getCompetitionMembers, sendMessage, deleteMessage } from '@repo/supabase';
import type { Database } from '@repo/types';
import { BLOCKED_CONTENT_MESSAGE, containsBlockedKeyword } from '@/lib/moderation/blocked-content';
import { getBlockedIds } from '@/lib/social/blocks';

type MemberRow = Database['public']['Tables']['competition_members']['Row'];
type ServerClient = Awaited<ReturnType<typeof getServerClient>>;

interface Params {
  params: Promise<{ id: string }>;
}

// Handles get member or fail.
async function getMemberOrFail(client: ServerClient, competitionId: string, userId: string) {
  const { data: membersData } = await getCompetitionMembers(client, competitionId);
  const members = (membersData ?? []) as MemberRow[];
  return members.find((m) => m.profile_id === userId && m.status === 'active') ?? null;
}

// Handles get.
export async function GET(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const member = await getMemberOrFail(adminClient, (await params).id, user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const pagination = cursor ? { cursor, limit } : { limit };

  const result = await getGroupChat(adminClient, (await params).id, pagination);
  if (result.error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });

  // Messages from people the caller has blocked are hidden from them.
  const blocked = await getBlockedIds(client, user.id);
  const messages = ((result.data ?? []) as { sender_profile_id: string }[]).filter(
    (message) => !blocked.has(message.sender_profile_id),
  );

  return NextResponse.json({ data: messages, hasMore: result.hasMore, nextCursor: result.nextCursor });
}

// Handles post.
export async function POST(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const member = await getMemberOrFail(adminClient, (await params).id, user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let content: string | undefined;
  try {
    ({ content } = await req.json() as { content?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  if (content.trim().length > 1000) {
    return NextResponse.json({ error: 'Messages must be 1000 characters or fewer' }, { status: 400 });
  }
  if (containsBlockedKeyword(content)) {
    return NextResponse.json(
      { error: { code: 'CONTENT_BLOCKED', message: BLOCKED_CONTENT_MESSAGE } },
      { status: 422 },
    );
  }

  const { error } = await sendMessage(adminClient, {
    sender_profile_id: user.id,
    competition_id: (await params).id,
    message_type: 'group_chat',
    content: content.trim(),
  });
  if (error) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });

  return NextResponse.json({ data: { success: true } }, { status: 201 });
}

// Handles delete.
export async function DELETE(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const adminClient = createAdminClient();

  const { messageId } = await req.json() as { messageId?: string };
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

  const { data: msg } = await adminClient
    .from('messages')
    .select('sender_profile_id')
    .eq('id', messageId)
    .single();

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isHost = await adminClient
    .from('competitions')
    .select('host_id, cohost_id')
    .eq('id', (await params).id)
    .single()
    .then(({ data }) => data?.host_id === user.id || data?.cohost_id === user.id);

  if (msg.sender_profile_id !== user.id && !isHost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await deleteMessage(adminClient, messageId);
  if (error) return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
