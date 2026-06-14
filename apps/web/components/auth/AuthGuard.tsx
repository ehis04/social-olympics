'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace('/login');
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
