// Dashboard — user's competitions with pull-to-refresh and create FAB.
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { CompetitionCard } from '@/components/competition/CompetitionCard';
import { MOBILE_ROUTES } from '@/constants/routes';
import { apiCall } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competitions', 'user', profile?.id],
    queryFn: async () => {
      const result = await apiCall<CompetitionRow[]>('/api/competitions/user');
      return result.data ?? [];
    },
    enabled: !!profile?.id,
  });

  const competitions = data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-neutral-200">
        <Text className="text-xl font-bold text-neutral-800">My Competitions</Text>
        <TouchableOpacity onPress={() => router.push(MOBILE_ROUTES.DISCOVER)}>
          <Text className="text-sm font-semibold text-primary">Discover</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={competitions}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-4 pb-24"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-neutral-800 font-semibold text-base mb-1">No competitions yet</Text>
              <Text className="text-neutral-500 text-sm text-center mb-6">
                Create your own or discover public competitions to join.
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-lg px-6 py-3"
                onPress={() => router.push(MOBILE_ROUTES.MODAL_CREATE_COMPETITION)}
              >
                <Text className="text-white font-semibold text-sm">Create Competition</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => <CompetitionCard competition={item} />}
      />

      <TouchableOpacity
        className="absolute bottom-8 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg"
        onPress={() => router.push(MOBILE_ROUTES.MODAL_CREATE_COMPETITION)}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
