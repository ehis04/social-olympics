/*
 * This file defines the index module.
 */

// Auth store — current session and profile; the profile is cached in secure storage across restarts.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Session } from '@supabase/supabase-js';
import type { Database } from '@repo/types';
import { secureStorage } from '@/lib/supabase/secure-storage';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: ProfileRow | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      loading: true,
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      clearAuth: () => set({ session: null, profile: null, loading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      // The session itself is restored by the Supabase client; only the profile is cached here.
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);
