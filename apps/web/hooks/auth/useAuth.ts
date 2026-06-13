'use client';

import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  const { session, user, profile, isLoading } = useAuthStore();
  return { session, user, profile, isLoading };
}
