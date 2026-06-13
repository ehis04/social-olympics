'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { createBrowserClient, getProfile } from '@repo/supabase';
import type { Database } from '@repo/types';
import { getQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default function Providers({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createBrowserClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data } = await getProfile(supabase, session.user.id);
        setProfile((data as ProfileRow) ?? null);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setProfile, setLoading]);

  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
