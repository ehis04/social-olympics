import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

export default function IndexScreen() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return null;
  }

  return session ? (
    <Redirect href="/(app)/(tabs)/dashboard" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}
