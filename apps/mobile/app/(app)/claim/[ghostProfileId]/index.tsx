// Ghost profile claim screen — transfers ghost stats to the authenticated user.
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getProfile } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';
import { useState } from 'react';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export default function ClaimScreen() {
  const { ghostProfileId } = useLocalSearchParams<{ ghostProfileId: string }>();
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);

  const { data: ghostProfile, isLoading } = useQuery({
    queryKey: ['profile', ghostProfileId],
    queryFn: async () => {
      const { data } = await getProfile(supabase, ghostProfileId);
      return data as ProfileRow | null;
    },
    enabled: !!ghostProfileId,
  });

  async function handleClaim() {
    setClaiming(true);
    const { error } = await apiCall(`/api/profile/claim/${ghostProfileId}`, {
      method: 'POST',
    });
    setClaiming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Profile claimed! All results transferred to your account.');
    router.replace(MOBILE_ROUTES.DASHBOARD);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  if (!ghostProfile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-neutral-500 text-sm text-center">
          This invite link is invalid or has already been claimed.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-6 py-10">
        <Text className="text-2xl font-bold text-neutral-800 mb-2">Claim your profile</Text>
        <Text className="text-neutral-500 text-sm mb-8">
          A competition host created a guest profile for you. Claim it to transfer all results,
          medals, and stats to your account.
        </Text>

        <View className="rounded-lg border border-neutral-200 p-5 mb-8">
          <Text className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-3">
            Guest profile
          </Text>
          <Text className="text-xl font-bold text-neutral-800 mb-1">
            {ghostProfile.display_name}
          </Text>
          {ghostProfile.country_code ? (
            <Text className="text-sm text-neutral-500">{ghostProfile.country_code}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center"
          onPress={handleClaim}
          disabled={claiming}
        >
          {claiming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Claim Profile</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="mt-4 py-3 items-center"
          onPress={() => router.replace(MOBILE_ROUTES.DASHBOARD)}
        >
          <Text className="text-neutral-400 text-sm">Not you? Go to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
