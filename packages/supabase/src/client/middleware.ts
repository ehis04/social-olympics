// Middleware Supabase client for Next.js middleware session refresh.
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@repo/types';

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
      get(name: string) {
        const cookie = request.headers.get('cookie') ?? '';
        const match = cookie
          .split(';')
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
      },
      set(name: string, value: string, options: CookieOptions) {
        const cookieStr = `${name}=${encodeURIComponent(value)}; Path=${options.path ?? '/'}; SameSite=${options.sameSite ?? 'Lax'}${options.httpOnly ? '; HttpOnly' : ''}${options.secure ? '; Secure' : ''}${options.maxAge !== undefined ? `; Max-Age=${options.maxAge}` : ''}`;
        response.headers.append('Set-Cookie', cookieStr);
      },
      remove(name: string, options: CookieOptions) {
        const cookieStr = `${name}=; Path=${options.path ?? '/'}; Max-Age=0`;
        response.headers.append('Set-Cookie', cookieStr);
      },
    },
  });

  return { client: supabase, response };
}
