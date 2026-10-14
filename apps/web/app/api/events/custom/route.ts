/*
 * This file handles requests for the custom events API route.
 */

// POST /api/events/custom — creates a custom event (is_custom = true) owned by the caller.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { createCustomEvent } from '@repo/supabase';
import { BLOCKED_CONTENT_MESSAGE, containsBlockedKeyword } from '@/lib/moderation/blocked-content';

const RESULT_TYPES = ['time', 'distance', 'score', 'inverted_score', 'weight', 'compound', 'possession'] as const;

const CustomEventSchema = z.object({
  name: z.string().trim().min(2, 'Event name must be at least 2 characters').max(60),
  category_slug: z.string().default('other'),
  result_type: z.enum(RESULT_TYPES),
  is_team_event: z.boolean().default(false),
  min_team_size: z.number().int().min(1).max(20).optional(),
  max_team_size: z.number().int().min(1).max(20).optional(),
  description: z.string().max(300).optional(),
  scoring_notes: z.string().max(300).optional(),
});

// Handles slugify.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'event';
}

// Handles post.
export async function POST(request: Request) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = CustomEventSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid custom event' }, { status: 400 });
  }
  const body = parsed.data;

  if (containsBlockedKeyword(body.name) || containsBlockedKeyword(body.description)) {
    return NextResponse.json({ error: BLOCKED_CONTENT_MESSAGE }, { status: 422 });
  }

  const { data: category } = await client
    .from('event_categories')
    .select('id')
    .eq('slug', body.category_slug)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }

  const minTeamSize = body.is_team_event ? body.min_team_size ?? 1 : null;
  const maxTeamSize = body.is_team_event ? Math.max(body.max_team_size ?? 10, minTeamSize ?? 1) : null;

  const payload: Record<string, unknown> = {
    name: body.name,
    slug: `custom-${slugify(body.name)}-${crypto.randomUUID().slice(0, 8)}`,
    category_id: (category as { id: string }).id,
    result_type: body.result_type,
    is_team_event: body.is_team_event,
    is_custom: true,
    created_by: user.id,
    is_active: true,
    min_team_size: minTeamSize,
    max_team_size: maxTeamSize,
    ...(body.description ? { description: body.description } : {}),
    ...(body.scoring_notes ? { scoring_notes: body.scoring_notes } : {}),
  };

  const { data, error } = await createCustomEvent(client, payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
