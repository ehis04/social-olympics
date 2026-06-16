// POST /api/profile/avatar — upload avatar image for the authenticated user
import { NextRequest, NextResponse } from 'next/server';
import { createBrowserClient } from '@repo/supabase';
import { getServerClient } from '@/lib/supabase/server';
import { uploadAvatar } from '@repo/supabase';

export async function POST(req: NextRequest) {
  const serverClient = getServerClient();
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

  // uploadAvatar needs a client with the user's auth context — use server client
  const { data: url, error } = await uploadAvatar(serverClient, user.id, file);
  if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

  return NextResponse.json({ data: { avatar_url: url } });
}
