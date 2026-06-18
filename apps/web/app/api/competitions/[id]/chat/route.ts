// GET/POST/DELETE /api/competitions/[id]/chat — group chat messages
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getGroupChat, getCompetitionMembers, sendMessage, deleteMessage } from '@repo/supabase';
import type { Database } from '@repo/types';

type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Params {
  params: { id: string };
}

async function getMemberOrFail(client: ReturnType<typeof getServerClient>, competitionId: string, userId: string) {
  const { data: membersData } = await getCompetitionMembers(client, competitionId);
  const members = (membersData ?? []) as MemberRow[];
  return members.find((m) => m.profile_id === userId) ?? null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const member = await getMemberOrFail(client, params.id, user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const pagination = cursor ? { cursor, limit } : { limit };

  const result = await getGroupChat(client, params.id, pagination);
  if (result.error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });

  return NextResponse.json({ data: result.data, hasMore: result.hasMore, nextCursor: result.nextCursor });
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const member = await getMemberOrFail(client, params.id, user.id);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { content } = await req.json() as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
  if (containsBlockedContent(content)) {
    return NextResponse.json(
      { error: { code: 'CONTENT_BLOCKED', message: 'Message contains blocked content' } },
      { status: 422 },
    );
  }

  const { error } = await sendMessage(client, {
    sender_profile_id: user.id,
    competition_id: params.id,
    message_type: 'group_chat',
    content: content.trim(),
  });
  if (error) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });

  return NextResponse.json({ data: { success: true } }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { messageId } = await req.json() as { messageId?: string };
  if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

  const { data: msg } = await client
    .from('messages')
    .select('sender_profile_id')
    .eq('id', messageId)
    .single();

  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isHost = await client
    .from('competitions')
    .select('host_id, cohost_id')
    .eq('id', params.id)
    .single()
    .then(({ data }) => data?.host_id === user.id || data?.cohost_id === user.id);

  if (msg.sender_profile_id !== user.id && !isHost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await deleteMessage(client, messageId);
  if (error) return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}

function containsBlockedContent(content: string): boolean {
  return /\bfuck(?:ing)?\b/i.test(content);
}
