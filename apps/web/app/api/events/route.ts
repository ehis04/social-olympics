// GET /api/events — fetches the active event library.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getEventsLibrary } from '@repo/supabase';

export async function GET(request: Request) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('categorySlug') ?? undefined;

  const { data, error } = await getEventsLibrary(client, categorySlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
