/*
 * This file handles requests for the avatar API route.
 */

// POST /api/profile/avatar — upload avatar image for the authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, uploadAvatar } from '@repo/supabase';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Creates the avatars bucket when a fresh environment has not run the storage migration.
async function ensureAvatarBucket(): Promise<string | null> {
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.storage.getBucket('avatars');
    if (data) return null;

    const { error } = await adminClient.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: MAX_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });
    if (error && !error.message.toLowerCase().includes('already exists')) return error.message;
    return null;
  } catch {
    return 'Avatar storage is not configured.';
  }
}

// Handles post.
export async function POST(req: NextRequest) {
  const serverClient = await getServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'The image could not be read. Choose a JPEG, PNG or WebP image under 5 MB.' },
      { status: 400 },
    );
  }

  const file = formData.get('avatar');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'The image must be 5 MB or smaller.' }, { status: 413 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG or WebP images are accepted.' }, { status: 400 });
  }

  // Storage policies let each user write only inside their own folder.
  let result = await uploadAvatar(serverClient, user.id, file, { contentType: file.type });

  if (result.error?.message.toLowerCase().includes('bucket not found')) {
    const bucketError = await ensureAvatarBucket();
    if (bucketError) return NextResponse.json({ error: bucketError }, { status: 500 });
    result = await uploadAvatar(serverClient, user.id, file, { contentType: file.type });
  }

  if (result.error) {
    const status = result.error.code === 'INVALID_TYPE' ? 400 : result.error.code === 'TOO_LARGE' ? 413 : 500;
    return NextResponse.json({ error: result.error.message }, { status });
  }

  return NextResponse.json({ data: { avatar_url: result.data } });
}
