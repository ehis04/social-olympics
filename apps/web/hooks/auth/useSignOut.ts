/*
 * This file provides the useSignOut React hook.
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

// Provides the use sign out hook.
export function useSignOut() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    clearAuth();
    router.push('/login');
  }

  return { signOut };
}
