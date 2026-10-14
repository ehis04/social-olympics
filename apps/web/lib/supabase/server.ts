/*
 * This file defines the server module.
 */

import { cookies, headers } from 'next/headers';
import { createServerClient } from '@repo/supabase';
import { createBearerClient, getBearerToken } from './bearer';

// Handles get server client.
export async function getServerClient() {
  const token = getBearerToken(await headers());
  if (token) return createBearerClient(token);
  return createServerClient(await cookies());
}
