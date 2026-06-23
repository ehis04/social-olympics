// POST /api/profile/avatar — upload avatar image for the authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, uploadAvatar } from '@repo/supabase';

async function ensureAvatarBucket() {
  const adminClient = createAdminClient();
  const { data } = await adminClient.storage.getBucket('avatars');

  if (!data) {
    const { error } = await adminClient.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    if (error && !error.message.toLowerCase().includes('already exists')) {
      return { adminClient, error };
    }
  }

  return { adminClient, error: null };
}

export async function POST(req: NextRequest) {
  const serverClient = await getServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('avatar');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'avatar file required' }, { status: 400 });
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP accepted' }, { status: 400 });
  }

  const { adminClient, error: bucketError } = await ensureAvatarBucket();
  if (bucketError) return NextResponse.json({ error: bucketError.message }, { status: 500 });

  const { data: url, error } = await uploadAvatar(adminClient, user.id, file);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { avatar_url: url } });
}
