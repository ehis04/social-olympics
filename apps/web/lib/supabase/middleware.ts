/*
 * This file defines the middleware module.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient as createSharedMiddlewareClient } from '@repo/supabase';

// Handles create middleware client.
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createSharedMiddlewareClient(request, response).client;
}
