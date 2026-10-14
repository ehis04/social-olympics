/*
 * This file handles requests for the result evidence API route.
 */

// POST /api/results/evidence — upload a photo that backs up a submitted result
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

const BUCKET = 'result-evidence';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Handles post. Returns the public URL to store as the result's evidence link.
export async function POST(req: NextRequest) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'The photo could not be read. Choose a JPEG, PNG or WebP image under 5 MB.' },
      { status: 400 },
    );
  }

  const file = formData.get('photo');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Choose a photo to upload.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'The photo must be 5 MB or smaller.' }, { status: 413 });
  }
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json({ error: 'Only JPEG, PNG or WebP photos are accepted.' }, { status: 400 });
  }

  // Storage policies let each user write only inside their own folder; the random
  // name keeps photos unguessable.
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    return NextResponse.json({ error: 'The photo could not be uploaded. Please try again.' }, { status: 500 });
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ data: { url: data.publicUrl } }, { status: 201 });
}
