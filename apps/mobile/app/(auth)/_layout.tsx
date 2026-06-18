// Auth stack — no tab bar, redirects to dashboard when already authenticated.
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout() {
  const router = useRouter();
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }, [session, loading, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
