// Authenticated root — guards all app screens, redirects to login if no session.
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function AppLayout() {
  const router = useRouter();
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login');
    }
  }, [session, loading, router]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="competitions/[id]" />
      <Stack.Screen name="profile/[profileId]" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="messages/index" />
      <Stack.Screen name="messages/[conversationId]" />
      <Stack.Screen name="claim/[ghostProfileId]" />
      <Stack.Screen
        name="modals/create-competition/index"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="modals/join-competition/index"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="modals/submit-result/index"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="modals/add-event/index"
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="modals/tiebreaker/index"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
