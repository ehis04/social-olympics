/*
 * This file handles requests for the profile API route.
 */

// PATCH /api/profile — update the authenticated user's profile
// DELETE /api/profile — permanently delete the authenticated user's account
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { ensureProfile } from '@/lib/profile/ensure-profile';
import { deleteAccount } from '@/lib/account/delete-account';
import type { Database } from '@repo/types';

interface ProfilePayload {
  display_name?: unknown;
  bio?: unknown;
  country_code?: unknown;
  city?: unknown;
  favourite_sport?: unknown;
}

type ProfileUpdate = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'display_name' | 'bio' | 'country_code' | 'city' | 'favourite_sport'
>;

// Handles normalize payload.
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

  if (typeof body.city === 'string') {
    const city = body.city.trim();
    payload.city = city.length > 0 ? city : null;
  } else if (body.city === null) {
    payload.city = null;
  }

  if (typeof body.favourite_sport === 'string') {
    const sport = body.favourite_sport.trim();
    payload.favourite_sport = sport.length > 0 ? sport : null;
  } else if (body.favourite_sport === null) {
    payload.favourite_sport = null;
  }

  if (body.bio === null) payload.bio = null;
  if (body.country_code === null) payload.country_code = null;

  return payload;
}

// Handles validate payload.
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

  if (payload.city && payload.city.length > 60) {
    return 'City must be 60 characters or fewer';
  }

  if (payload.favourite_sport && payload.favourite_sport.length > 40) {
    return 'Favourite sport must be 40 characters or fewer';
  }

  return null;
}

// Handles patch.
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
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

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

// Handles get.
export async function GET() {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await ensureProfile(user);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adminIds = (process.env.ADMIN_PROFILE_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  return NextResponse.json({ data: data ? { ...data, is_admin: adminIds.includes(user.id) } : data });
}

// Handles delete. The body must contain { confirm: 'DELETE' } so an account is never removed by accident.
export async function DELETE(request: Request) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: { confirm?: unknown };
  try {
    body = (await request.json()) as { confirm?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (body.confirm !== 'DELETE') {
    return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  }

  const { error } = await deleteAccount(createAdminClient(), user.id);
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({ data: { deleted: true } });
}
