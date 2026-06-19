// POST /api/feed/[feedItemId]/comments — add a comment to a feed item
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { addFeedComment } from '@repo/supabase';

interface Params {
  params: { feedItemId: string };
}

interface RequestBody {
  content: string;
}

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

  const content = body.content?.trim();
  if (!content || content.length === 0) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'content is required' } }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'content must be 500 characters or fewer' } }, { status: 400 });
  }

  const { data, error } = await addFeedComment(client, params.feedItemId, content);

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}
