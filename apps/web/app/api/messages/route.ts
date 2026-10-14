/*
 * This file handles requests for the messages API route.
 */

// GET/POST/DELETE /api/messages — DM conversations and sending
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getConversations, getDirectMessages, sendMessage, deleteMessage } from '@repo/supabase';
import { createNotification } from '@/lib/notifications/create-notification';
import { getBlockedIds, isBlockedBetween } from '@/lib/social/blocks';

// Handles get.
export async function GET(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const url = new URL(req.url);
  const partnerId = url.searchParams.get('partnerId');

  if (partnerId) {
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const limit = Number(url.searchParams.get('limit') ?? 30);
    const pagination = cursor ? { cursor, limit } : { limit };
    const result = await getDirectMessages(client, user.id, partnerId, pagination);
    if (result.error) return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    return NextResponse.json({ data: result.data, hasMore: result.hasMore, nextCursor: result.nextCursor });
  }

  const { data, error } = await getConversations(client, user.id);
  if (error) return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });

  // Conversations with people the caller has blocked are hidden from their inbox.
  const blocked = await getBlockedIds(client, user.id);
  const visible = ((data ?? []) as { sender_profile_id: string; recipient_profile_id: string }[]).filter((message) => {
    const partnerId = message.sender_profile_id === user.id ? message.recipient_profile_id : message.sender_profile_id;
    return !blocked.has(partnerId);
  });

  return NextResponse.json({ data: visible });
}

// Handles post.
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let payload: { recipientId?: string; content?: string };
  try {
    payload = await req.json() as { recipientId?: string; content?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { recipientId, content } = payload;
  if (!recipientId || !content?.trim()) {
    return NextResponse.json({ error: 'recipientId and content required' }, { status: 400 });
  }
  if (recipientId === user.id) {
    return NextResponse.json({ error: 'You cannot message yourself' }, { status: 400 });
  }
  if (content.trim().length > 1000) {
    return NextResponse.json({ error: 'Messages must be 1000 characters or fewer' }, { status: 400 });
  }
  if (await isBlockedBetween(client, user.id, recipientId)) {
    return NextResponse.json({ error: "You can't message this person." }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: recipient } = await adminClient
    .from('profiles')
    .select('deleted_at, is_ghost')
    .eq('id', recipientId)
    .maybeSingle();
  if (!recipient || recipient.deleted_at || recipient.is_ghost) {
    return NextResponse.json({ error: "You can't message this person." }, { status: 403 });
  }

  const { error } = await sendMessage(client, {
    sender_profile_id: user.id,
    recipient_profile_id: recipientId,
    message_type: 'direct_message',
    content: content.trim(),
  });
  if (error) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });

  const { data: sender } = await adminClient
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  await createNotification(adminClient, {
    profileId: recipientId,
    type: 'direct_message',
    title: `New message from ${sender?.display_name ?? 'a competitor'}`,
    body: content.trim().slice(0, 160),
    data: { sender_profile_id: user.id, href: `/messages/${user.id}` },
  });

  return NextResponse.json({ data: { success: true } }, { status: 201 });
}

// Handles delete.
export async function DELETE(req: NextRequest) {
  const client = await getServerClient();
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
  if (msg.sender_profile_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await deleteMessage(client, messageId);
  if (error) return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
