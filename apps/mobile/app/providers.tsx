// Client providers — auth listener, notification handler, toast setup.
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth';
import { getProfile } from '@repo/supabase';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const { setSession, setProfile, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await getProfile(supabase, session.user.id);
        if (data) setProfile(data as ProfileRow);
      } else {
        clearAuth();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading, clearAuth]);

  return (
    <>
      {children}
      <Toast />
    </>
  );
}
