/*
 * This file verifies that the mobile app stores sessions larger than the secure store limit.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createChunkedStorage } from '../../../mobile/lib/supabase/chunked-storage';

const store = new Map<string, string>();

// An in-memory stand-in for expo-secure-store, which rejects values over about 2KB.
const fakeSecureStore = {
  getItemAsync: async (key: string) => store.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    if (value.length > 2048) throw new Error('Value too large');
    store.set(key, value);
  },
  deleteItemAsync: async (key: string) => { store.delete(key); },
};

const secureStorage = createChunkedStorage(fakeSecureStore);

beforeEach(() => store.clear());

describe('mobile secure storage', () => {
  it('round-trips a value larger than the secure store limit', async () => {
    const session = JSON.stringify({ access_token: 'a'.repeat(5000), refresh_token: 'r'.repeat(100) });
    await secureStorage.setItem('sb-auth-token', session);
    expect(await secureStorage.getItem('sb-auth-token')).toBe(session);
    expect(store.get('sb-auth-token.chunks')).toBe('3');
  });

  it('removes leftover chunks when a shorter value replaces a longer one', async () => {
    await secureStorage.setItem('key', 'x'.repeat(4000));
    await secureStorage.setItem('key', 'short');
    expect(await secureStorage.getItem('key')).toBe('short');
    expect(store.has('key.1')).toBe(false);
  });

  it('returns null for missing or removed values', async () => {
    expect(await secureStorage.getItem('missing')).toBeNull();
    await secureStorage.setItem('key', 'value');
    await secureStorage.removeItem('key');
    expect(await secureStorage.getItem('key')).toBeNull();
    expect(store.size).toBe(0);
  });
});
