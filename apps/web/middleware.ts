/*
 * This file applies authentication, rate limiting, and content checks at the request boundary.
 */

// Next.js 16 prefers the name proxy.ts, but proxy always runs on the Node.js runtime, which the
// Cloudflare Workers adapter (@opennextjs/cloudflare) cannot deploy. middleware.ts runs on the Edge
// runtime and deploys. Keep this name until the adapter supports Node.js middleware.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiLimiter, authLimiter, reportLimiter } from '@/lib/rate-limit';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { createBearerClient, getBearerToken } from '@/lib/supabase/bearer';
import { getSafeNextPath } from '@/lib/auth/safe-next';
import { containsBlockedKeyword } from '@/lib/moderation/blocked-content';

// Handles get text payload field.
function getTextPayloadField(body: Record<string, unknown>): string | null {
  if (typeof body.content === 'string') return body.content;
  if (typeof body.name === 'string') return body.name;
  if (typeof body.description === 'string') return body.description;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.display_name === 'string') return body.display_name;
  return null;
}

// Handles get ip.
function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

// Handles rate limit response.
function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return NextResponse.json(
    { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests: please slow down.' } },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    },
  );
}

// Applies request-boundary protections before a route is handled.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const token = request.nextUrl.pathname.startsWith('/api/') ? getBearerToken(request.headers) : null;
  const supabase = token ? createBearerClient(token) : createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Preserve session updates on redirects and forward them to Server Components.
  function withSession(nextResponse: NextResponse) {
    response.headers.forEach((value, name) => {
      if (name !== 'set-cookie' && name !== 'x-middleware-next') {
        nextResponse.headers.set(name, value);
      }
    });
    for (const cookie of response.headers.getSetCookie()) {
      nextResponse.headers.append('Set-Cookie', cookie);
    }
    return nextResponse;
  }

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password');

  const isPublicRoute =
    pathname.startsWith('/about') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/api/auth/callback') ||
    // Signing out must work even when the session is no longer valid, so stale cookies are cleared.
    pathname.startsWith('/api/auth/signout') ||
    pathname === '/';

  if (isAuthRoute && request.method === 'POST') {
    const { success, reset } = await authLimiter.limit(getIp(request));
    if (!success) return withSession(rateLimitResponse(reset));
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    if (pathname.startsWith('/api/')) {
      return withSession(NextResponse.json(
        { data: null, error: { code: 'UNAUTHORISED', message: 'Sign in to continue.' } },
        { status: 401 },
      ));
    }
    const loginUrl = new URL('/login', request.url);
    // Remember where the visitor was going (invite links, claim links) so sign-in can return there.
    if (request.method === 'GET') {
      const next = getSafeNextPath(`${pathname}${request.nextUrl.search}`, '');
      if (next) loginUrl.searchParams.set('next', next);
    }
    return withSession(NextResponse.redirect(loginUrl));
  }

  if (user && isAuthRoute) {
    const next = getSafeNextPath(request.nextUrl.searchParams.get('next'));
    return withSession(NextResponse.redirect(new URL(next, request.url)));
  }

  if (user && request.method === 'POST' && pathname.startsWith('/api/')) {
    const limiter = pathname === '/api/report' ? reportLimiter : apiLimiter;
    const { success, reset } = await limiter.limit(user.id);
    if (!success) return withSession(rateLimitResponse(reset));

    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = (await request.clone().json()) as Record<string, unknown>;
        const textField = getTextPayloadField(body);

        if (textField && containsBlockedKeyword(textField)) {
          return withSession(NextResponse.json(
            { data: null, error: { code: 'CONTENT_BLOCKED', message: 'Your message contains language that is not permitted on this platform.' } },
            { status: 422 },
          ));
        }
      } catch {
        // Non-JSON or empty body — skip filter.
      }
    }
  }

  return withSession(NextResponse.next({ request: { headers: request.headers } }));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
