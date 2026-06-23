// Uploads an avatar to Storage and updates the profile's avatar_url.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function uploadAvatar(
  client: SupabaseClient,
  profileId: string,
  file: File,
): Promise<ApiResponse<string>> {
  try {
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${profileId}/avatar.${extension}`;

    const { error: uploadError } = await client.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      return { data: null, error: { code: uploadError.message, message: uploadError.message } };
    }

    const { data: urlData } = client.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await client
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profileId);

    if (updateError) {
      return { data: null, error: { code: updateError.code, message: updateError.message } };
    }

    return { data: publicUrl, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
