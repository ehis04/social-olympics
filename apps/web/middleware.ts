import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
    pathname === '/';

  if (!user && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Keyword filter — applies to mutating API routes only
  if (
    user &&
    request.method === 'POST' &&
    pathname.startsWith('/api/') &&
    request.headers.get('content-type')?.includes('application/json')
  ) {
    try {
      const cloned = request.clone();
      const body = (await cloned.json()) as Record<string, unknown>;
      const textField = getTextPayloadField(body);

      if (textField && containsBlockedKeyword(textField)) {
        return NextResponse.json(
          { data: null, error: { code: 'CONTENT_BLOCKED', message: 'Your message contains language that is not permitted on this platform.' } },
          { status: 422 },
        );
      }
    } catch {
      // Non-JSON body or empty — skip filter
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
