import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiLimiter, authLimiter, reportLimiter } from '@/lib/rate-limit';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

const BLOCKED_KEYWORDS = [
  'fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'retard',
  'kike', 'spic', 'chink', 'whore', 'bitch', 'asshole', 'bastard',
];

function containsBlockedKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));
}

function getTextPayloadField(body: Record<string, unknown>): string | null {
  if (typeof body.content === 'string') return body.content;
  if (typeof body.name === 'string') return body.name;
  if (typeof body.description === 'string') return body.description;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.display_name === 'string') return body.display_name;
  return null;
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return NextResponse.json(
    { data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests — please slow down.' } },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(reset),
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareClient(request, response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password');

  const isPublicRoute =
    pathname.startsWith('/about') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname === '/';

  if (isAuthRoute && request.method === 'POST') {
    const { success, reset } = await authLimiter.limit(getIp(request));
    if (!success) return rateLimitResponse(reset);
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user && request.method === 'POST' && pathname.startsWith('/api/')) {
    const limiter = pathname === '/api/report' ? reportLimiter : apiLimiter;
    const { success, reset } = await limiter.limit(user.id);
    if (!success) return rateLimitResponse(reset);

    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = (await request.clone().json()) as Record<string, unknown>;
        const textField = getTextPayloadField(body);

        if (textField && containsBlockedKeyword(textField)) {
          return NextResponse.json(
            { data: null, error: { code: 'CONTENT_BLOCKED', message: 'Your message contains language that is not permitted on this platform.' } },
            { status: 422 },
          );
        }
      } catch {
        // Non-JSON or empty body — skip filter.
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
