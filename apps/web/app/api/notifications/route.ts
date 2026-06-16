// GET/POST /api/notifications — fetch and mark notifications read
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getNotifications, markNotificationsRead } from '@repo/supabase';

export async function GET(_req: NextRequest) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await getNotifications(client, user.id);
  if (error) return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { ids } = await req.json() as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 });
  }

  const { error } = await markNotificationsRead(client, user.id, ids);
  if (error) return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 });

  return NextResponse.json({ data: { success: true } });
}
