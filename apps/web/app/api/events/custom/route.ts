// POST /api/events/custom — creates a custom event (is_custom = true).
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createCustomEvent } from '@repo/supabase';

interface CustomEventBody {
  name: string;
  category_slug: string;
  result_type: string;
  is_team_event?: boolean;
  min_team_size?: number;
  max_team_size?: number;
  description?: string;
  scoring_notes?: string;
}

export async function POST(request: Request) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: CustomEventBody;
  try {
    body = (await request.json()) as CustomEventBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
  }
  if (!body.result_type) {
    return NextResponse.json({ error: 'Result type is required' }, { status: 400 });
  }

  const { data: category } = await client
    .from('event_categories')
    .select('id')
    .eq('slug', body.category_slug)
    .single();

  if (!category) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
    category_id: (category as { id: string }).id,
    result_type: body.result_type,
    is_team_event: body.is_team_event ?? false,
    created_by: user.id,
    is_active: true,
    ...(body.min_team_size && { min_team_size: body.min_team_size }),
    ...(body.max_team_size && { max_team_size: body.max_team_size }),
    ...(body.description && { description: body.description }),
    ...(body.scoring_notes && { scoring_notes: body.scoring_notes }),
  };

  const { data, error } = await createCustomEvent(client, payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
