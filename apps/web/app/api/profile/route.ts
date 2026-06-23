// PATCH /api/profile — update the authenticated user's profile
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { ensureProfile } from '@/lib/profile/ensure-profile';
import type { Database } from '@repo/types';

interface ProfilePayload {
  display_name?: unknown;
  bio?: unknown;
  country_code?: unknown;
}

type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'display_name' | 'bio' | 'country_code'
>;

function normalizePayload(body: ProfilePayload): ProfileUpdate {
  const payload: ProfileUpdate = {};

  if (typeof body.display_name === 'string') {
    payload.display_name = body.display_name.trim();
  }

  if (typeof body.bio === 'string') {
    const bio = body.bio.trim();
    payload.bio = bio.length > 0 ? bio : null;
  }

  if (typeof body.country_code === 'string') {
    const countryCode = body.country_code.trim().toUpperCase();
    payload.country_code = countryCode.length > 0 ? countryCode : null;
  }

  return payload;
}

function validatePayload(payload: ProfileUpdate): string | null {
  if ('display_name' in payload) {
    const displayName = payload.display_name ?? '';
    if (displayName.length < 2 || displayName.length > 30) {
      return 'Display name must be between 2 and 30 characters';
    }
  }

  if (payload.bio && payload.bio.length > 500) {
    return 'Bio must be 500 characters or fewer';
  }

  if (payload.country_code && !/^[A-Z]{2}$/.test(payload.country_code)) {
    return 'Country code must be 2 letters';
  }

  return null;
}

export async function PATCH(request: Request) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: ProfilePayload;
  try {
    body = (await request.json()) as ProfilePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const payload = normalizePayload(body);
  const validationError = validatePayload(payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('profiles')
    .update(payload)
    .eq('id', user.id)
    .select('*, career_stats(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

export async function GET() {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await ensureProfile(user);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
