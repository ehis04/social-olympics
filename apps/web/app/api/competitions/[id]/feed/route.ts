/*
 * This file handles requests for the feed API route.
 */

// GET /api/competitions/[id]/feed — paginated activity feed
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getFeed, getCompetitionMembers } from '@repo/supabase';
import type { Database } from '@repo/types';
import { getBlockedIds } from '@/lib/social/blocks';

type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Params {
  params: Promise<{ id: string }>;
}

// Handles get.
export async function GET(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: membersData } = await getCompetitionMembers(client, (await params).id);
  const members = (membersData ?? []) as MemberRow[];
  const isMember = members.some((m) => m.profile_id === user.id);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const pagination = cursor ? { cursor, limit } : { limit };

  const result = await getFeed(client, (await params).id, pagination);
  if (result.error) return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });

  const items = (result.data ?? []) as Array<Record<string, unknown>>;

  // Enrich each feed item with reactions grouped by emoji
  const itemIds = items.map((i) => i.id as string);
  let reactionsMap: Record<string, Array<{ emoji: string; profile_id: string }>> = {};
  if (itemIds.length > 0) {
    const { data: reactionsData } = await client
      .from('reactions')
      .select('target_id, emoji, profile_id')
      .eq('target_type', 'feed_item')
      .in('target_id', itemIds);

    for (const r of reactionsData ?? []) {
      const row = r as { target_id: string; emoji: string; profile_id: string };
      if (!reactionsMap[row.target_id]) reactionsMap[row.target_id] = [];
      reactionsMap[row.target_id]!.push({ emoji: row.emoji, profile_id: row.profile_id });
    }
  }

  // Comments from people the caller has blocked are hidden from them.
  const blocked = await getBlockedIds(client, user.id);

  const enriched = items.map((item) => {
    const rawReactions = reactionsMap[item.id as string] ?? [];
    const reactionCounts: Record<string, { count: number; reactedByMe: boolean }> = {};
    for (const r of rawReactions) {
      if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, reactedByMe: false };
      reactionCounts[r.emoji]!.count += 1;
      if (r.profile_id === user.id) reactionCounts[r.emoji]!.reactedByMe = true;
    }
    const reactions = Object.entries(reactionCounts).map(([emoji, v]) => ({ emoji, ...v }));
    const comments = ((item.feed_comments as { profile_id?: string }[] | null) ?? [])
      .filter((comment) => !comment.profile_id || !blocked.has(comment.profile_id));
    return { ...item, feed_comments: comments, reactions };
  });

  return NextResponse.json({ data: enriched, hasMore: result.hasMore, nextCursor: result.nextCursor });
}
