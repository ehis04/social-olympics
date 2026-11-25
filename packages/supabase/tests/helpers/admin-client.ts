/*
 * This file defines the admin client module.
 */

import { createAdminClient } from '../../src/client/admin';

const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Handles create test admin client.
export function createTestAdminClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? LOCAL_SUPABASE_URL;
  let hostname: string;

  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error('Supabase integration tests require a valid local Supabase URL.');
  }

  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '[::1]') {
    throw new Error(
      `Refusing to run Supabase integration tests against non-local host "${hostname}".`,
    );
  }

  process.env['NEXT_PUBLIC_SUPABASE_URL'] = supabaseUrl;
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??= LOCAL_SERVICE_ROLE_KEY;

  return createAdminClient();
}
