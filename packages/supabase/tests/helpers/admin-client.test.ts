import { afterEach, describe, expect, it } from 'vitest';
import { createTestAdminClient } from './admin-client';

const originalUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const originalServiceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
  } else {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = originalUrl;
  }

  if (originalServiceRoleKey === undefined) {
    delete process.env['SUPABASE_SERVICE_ROLE_KEY'];
  } else {
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = originalServiceRoleKey;
  }
});

describe('createTestAdminClient', () => {
  it('refuses to target a non-local Supabase project', () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://production.supabase.co';

    expect(() => createTestAdminClient()).toThrow(/non-local host "production\.supabase\.co"/);
  });

  it('uses the local Supabase URL by default', () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];

    expect(createTestAdminClient()).toBeDefined();
    expect(process.env['NEXT_PUBLIC_SUPABASE_URL']).toBe('http://127.0.0.1:54321');
  });
});
