// POST /api/feed/[feedItemId]/reactions — add a reaction; DELETE — remove it
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { addReaction, removeReaction } from '@repo/supabase';

interface Params {
  params: Promise<{ feedItemId: string }>;
}

interface RequestBody {
  emoji: string;
}

const ALLOWED_EMOJIS = ['👏', '🔥', '🥇', '😂', '😮'];

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  if (!body.emoji || !ALLOWED_EMOJIS.includes(body.emoji)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid emoji' } }, { status: 400 });
  }

  const { data, error } = await addReaction(client, {
    target_type: 'feed_item',
    target_id: (await params).feedItemId,
    profile_id: user.id,
    emoji: body.emoji,
  });

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  if (!body.emoji || !ALLOWED_EMOJIS.includes(body.emoji)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid emoji' } }, { status: 400 });
  }

  const { data: reaction } = await client
    .from('reactions')
    .select('id')
    .eq('target_type', 'feed_item')
    .eq('target_id', (await params).feedItemId)
    .eq('profile_id', user.id)
    .eq('emoji', body.emoji)
    .single();

  if (!reaction) return NextResponse.json({ data: null, error: null });

  const { data, error } = await removeReaction(client, reaction.id);

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
