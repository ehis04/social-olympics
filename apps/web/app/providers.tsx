'use client';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { createBrowserClient, getProfile } from '@repo/supabase';
import type { Database } from '@repo/types';
import type { Session } from '@supabase/supabase-js';
import { getQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default function Providers({ children }: { children: React.ReactNode }) {
  const { setSession, setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    async function syncSession(session: Session | null) {
      if (!isMounted) return;

      try {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          const { data } = await getProfile(supabase, session.user.id);
          if (isMounted) setProfile((data as ProfileRow) ?? null);
        } else {
          setProfile(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => syncSession(data.session))
      .catch(() => syncSession(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setProfile, setLoading]);

  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}
