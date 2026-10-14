/*
 * This file splits large values across several secure-store entries.
 */

// The subset of expo-secure-store this module needs, so it can be tested without native code.
export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// SecureStore values are limited to about 2KB, and a Supabase session is larger, so each
// value is split into numbered chunks with a count stored under the original key.
const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

// Creates a storage adapter for the Supabase client on top of a small key-value store.
export function createChunkedStorage(store: KeyValueStore) {
  async function removeChunks(key: string): Promise<void> {
    const count = Number(await store.getItemAsync(countKey(key))) || 0;
    await Promise.all(Array.from({ length: count }, (_, index) => store.deleteItemAsync(chunkKey(key, index))));
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const count = Number(await store.getItemAsync(countKey(key))) || 0;
      if (count === 0) return null;
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) => store.getItemAsync(chunkKey(key, index))),
      );
      if (chunks.some((chunk) => chunk === null)) return null;
      return chunks.join('');
    },
    async setItem(key: string, value: string): Promise<void> {
      await removeChunks(key);
      const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
      await Promise.all(chunks.map((chunk, index) => store.setItemAsync(chunkKey(key, index), chunk)));
      await store.setItemAsync(countKey(key), String(chunks.length));
    },
    async removeItem(key: string): Promise<void> {
      await removeChunks(key);
    },
  };
}
