/*
 * This file handles requests for the callback API route.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getSafeNextPath } from '@/lib/auth/safe-next';

// Handles get.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const errorDescription = request.nextUrl.searchParams.get('error_description');
  const next = getSafeNextPath(request.nextUrl.searchParams.get('next'));

  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'message',
      errorDescription ?? 'Email confirmation failed. Please request a fresh confirmation link.',
    );
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await getServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('message', exchangeError.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
