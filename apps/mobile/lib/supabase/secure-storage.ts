/*
 * This file stores the sign-in session securely on the device.
 */

import * as SecureStore from 'expo-secure-store';
import { createChunkedStorage } from './chunked-storage';

// The web build (used for quick previews) has no keychain, so it falls back to localStorage.
const webStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage can be unavailable in private browsing.
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Storage can be unavailable in private browsing.
    }
  },
};

// EXPO_OS is set by the Expo bundler to ios, android or web.
export const secureStorage = process.env.EXPO_OS === 'web' ? webStorage : createChunkedStorage(SecureStore);
