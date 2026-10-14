/*
 * This file provides the useAuth React hook.
 */

'use client';

import { useAuthStore } from '@/stores/auth';

// Provides the use auth hook.
export function useAuth() {
  const { session, user, profile, isLoading } = useAuthStore();
  return { session, user, profile, isLoading };
}
