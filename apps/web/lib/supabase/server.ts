import { cookies } from 'next/headers';
import { createServerClient } from '@repo/supabase';

export function getServerClient() {
  return createServerClient(cookies());
}
