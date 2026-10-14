/*
 * This file defines the index module.
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth';

// Renders the index screen component.
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
