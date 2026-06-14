import type { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient as createSharedMiddlewareClient } from '@repo/supabase';

export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createSharedMiddlewareClient(request, response).client;
}
