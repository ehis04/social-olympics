/*
 * This file verifies return-path validation after sign-in.
 */

import { describe, expect, it } from 'vitest';
import { getSafeNextPath, withNext } from '@/lib/auth/safe-next';

describe('getSafeNextPath', () => {
  it('keeps same-site paths with their query', () => {
    expect(getSafeNextPath('/competitions/join?code=ABCD1234')).toBe('/competitions/join?code=ABCD1234');
  });

  it('rejects external, protocol-relative and auth paths', () => {
    expect(getSafeNextPath('https://evil.example')).toBe('/dashboard');
    expect(getSafeNextPath('//evil.example')).toBe('/dashboard');
    expect(getSafeNextPath('/\\evil.example')).toBe('/dashboard');
    expect(getSafeNextPath('/login')).toBe('/dashboard');
    expect(getSafeNextPath('/api/profile')).toBe('/dashboard');
    expect(getSafeNextPath(null)).toBe('/dashboard');
  });

  it('builds auth links that carry the return path', () => {
    expect(withNext('/register', '/claim/123')).toBe('/register?next=%2Fclaim%2F123');
    expect(withNext('/login', 'https://evil.example')).toBe('/login');
  });
});
