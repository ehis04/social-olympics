import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

export async function createTestAuthUser(
  admin: SupabaseClient<Database>,
  displayName: string,
): Promise<string> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await admin.auth.admin.createUser({
    email: `${displayName}-${unique}@example.test`,
    password: `test-password-${unique}`,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      date_of_birth: '1990-01-01',
    },
  });

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Failed to create test auth user');
  }

  return userId;
}

export async function deleteTestAuthUser(
  admin: SupabaseClient<Database>,
  userId: string | undefined,
): Promise<void> {
  if (!userId) {
    return;
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
}
