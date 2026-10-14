/*
 * This file defines the client module.
 */

// Mobile Supabase client — uses expo-secure-store for session persistence.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';
import { secureStorage } from './secure-storage';

// Handles get supabase url.
function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }

  return url.replace(/\/rest\/v1\/?$/, '');
}

// Handles get supabase anon key.
function getSupabaseAnonKey(): string {
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return key;
}

export const supabase = createClient<Database>(
  getSupabaseUrl(),
  getSupabaseAnonKey(),
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
