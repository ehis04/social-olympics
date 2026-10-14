/*
 * This file defines the auth state module.
 */

import path from 'path';
import { readFileSync } from 'node:fs';

export const AUTH_FILE = path.join(__dirname, '../.auth/user.json');
export const HOST_AUTH_FILE = path.join(__dirname, '../.auth/host.json');

interface StorageState {
  cookies: Array<{ name: string; value: string }>;
}

export function getSessionFromAuthState(storageStatePath: string): { access_token?: string; user?: { id?: string } } | null {
  const storageState = JSON.parse(readFileSync(storageStatePath, 'utf8')) as StorageState;
  const cookies = storageState.cookies.filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
  if (cookies.length === 0) return null;
  const baseName = cookies[0]!.name.replace(/\.\d+$/, '');
  const value = cookies.filter((cookie) => cookie.name === baseName || cookie.name.startsWith(`${baseName}.`))
    .sort((a, b) => Number(a.name.split('.').at(-1)) - Number(b.name.split('.').at(-1)))
    .map((cookie) => cookie.value).join('');
  if (!value.startsWith('base64-')) return null;
  return JSON.parse(Buffer.from(value.slice('base64-'.length), 'base64url').toString('utf8'));
}

// Reads the authenticated Supabase user ID from a saved Playwright storage state.
export function getUserIdFromAuthState(storageStatePath: string): string | null {
  return getSessionFromAuthState(storageStatePath)?.user?.id ?? null;
}
