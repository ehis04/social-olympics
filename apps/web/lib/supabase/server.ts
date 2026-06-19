import { cookies } from 'next/headers';
import { createServerClient } from '@repo/supabase';

export async function getServerClient() {
  return createServerClient(await cookies());
}
