/*
 * This file defines the AuthGuard user-interface component.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { useAuthStore } from '@/stores/auth';
import { getSafeNextPath } from '@/lib/auth/safe-next';

// Renders the auth guard component.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !session) {
      const next = getSafeNextPath(`${window.location.pathname}${window.location.search}`, '');
      router.replace((next ? `/login?next=${encodeURIComponent(next)}` : '/login') as Route);
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-grey-200 border-t-primary" />
      </div>
    );
  }

  if (!session) return null;

  return <>{children}</>;
}
