/*
 * This file defines the upload avatar module.
 */

// Uploads an avatar to Storage and updates the profile's avatar_url.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export interface UploadAvatarOptions {
  /** Required when uploading raw bytes (for example from React Native). */
  contentType?: string;
}

// Handles get extension.
function getExtension(contentType: string): string {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

// Handles get byte size.
function getByteSize(file: Blob | ArrayBuffer | ArrayBufferView): number {
  if (file instanceof ArrayBuffer) return file.byteLength;
  if (ArrayBuffer.isView(file)) return file.byteLength;
  return file.size;
}

// Handles upload avatar.
export async function uploadAvatar(
  client: SupabaseClient,
  profileId: string,
  file: Blob | ArrayBuffer | ArrayBufferView,
  options: UploadAvatarOptions = {},
): Promise<ApiResponse<string>> {
  try {
    const blobType = file instanceof Blob ? file.type : '';
    const contentType = options.contentType || blobType || 'image/jpeg';

    if (!(AVATAR_MIME_TYPES as readonly string[]).includes(contentType)) {
      return { data: null, error: { code: 'INVALID_TYPE', message: 'Choose a JPEG, PNG or WebP image.' } };
    }
    if (getByteSize(file) > AVATAR_MAX_BYTES) {
      return { data: null, error: { code: 'TOO_LARGE', message: 'The image must be 5 MB or smaller.' } };
    }

    // A new file name for every upload means browsers and image caches never show the old picture.
    const fileName = `avatar-${Date.now()}.${getExtension(contentType)}`;
    const path = `${profileId}/${fileName}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType, cacheControl: '31536000' });

    if (uploadError) {
      return { data: null, error: { code: 'UPLOAD_FAILED', message: uploadError.message } };
    }

    const { data: urlData } = client.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await client
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profileId);

    if (updateError) {
      await client.storage.from('avatars').remove([path]);
      return { data: null, error: { code: updateError.code, message: updateError.message } };
    }

    // Remove earlier avatars for this profile. A failure here does not affect the new picture.
    const { data: existing } = await client.storage.from('avatars').list(profileId);
    const stale = (existing ?? [])
      .map((object) => object.name)
      .filter((name) => name !== fileName)
      .map((name) => `${profileId}/${name}`);
    if (stale.length > 0) await client.storage.from('avatars').remove(stale);

    return { data: publicUrl, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
