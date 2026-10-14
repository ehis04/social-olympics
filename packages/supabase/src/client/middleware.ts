/*
 * This file defines the middleware module.
 */

// Middleware Supabase client for Next.js middleware session refresh.
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

// Handles create middleware client.
export function createMiddlewareClient(
  request: Request,
  response: Response,
): { client: SupabaseClient<Database>; response: Response } {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (!url || !key) {
    throw new Error('Missing Supabase URL or anon key environment variables');
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll(cookiesToSet, headers) {
        // Downstream rendering must see refreshed or removed sessions immediately.
        const cookies = new Map(
          parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => [name, value ?? '']),
        );
        for (const { name, value, options } of cookiesToSet) {
          if (options.maxAge === 0) cookies.delete(name);
          else cookies.set(name, value);
          response.headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
        }
        request.headers.set('cookie', Array.from(cookies, ([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; '));
        for (const [name, value] of Object.entries(headers ?? {})) {
          response.headers.set(name, value);
        }
      },
    },
  });

  return { client: supabase, response };
}
