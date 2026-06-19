// Mobile Supabase client — uses expo-secure-store for session persistence.
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@repo/types';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }

  return url.replace(/\/rest\/v1\/?$/, '');
}

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
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
