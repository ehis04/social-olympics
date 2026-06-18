// Discover — public competitions with debounced search and country filter.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { CompetitionCard } from '@/components/competition/CompetitionCard';
import { MOBILE_ROUTES } from '@/constants/routes';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

const COUNTRY_FILTERS = [
  { label: 'All', value: '' },
  { label: '🇮🇪 Ireland', value: 'IE' },
  { label: '🇬🇧 UK', value: 'GB' },
  { label: '🇺🇸 US', value: 'US' },
  { label: '🇩🇪 Germany', value: 'DE' },
  { label: '🇫🇷 France', value: 'FR' },
  { label: '🇦🇺 Australia', value: 'AU' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');

  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (country) params.set('country_code', country);

  const queryString = params.toString();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competitions', 'public', queryString],
    queryFn: async () => {
      const result = await apiCall<CompetitionRow[]>(
        `/api/competitions${queryString ? `?${queryString}` : ''}`
      );
      return result.data ?? [];
    },
  });

  const competitions = data ?? [];

  async function handleJoin(competitionId: string) {
    const { error } = await apiCall(`/api/competitions/${competitionId}/join`, {
      method: 'POST',
      body: JSON.stringify({ profile_id: profile?.id }),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Joined competition!');
    router.push(MOBILE_ROUTES.COMPETITION_FEED(competitionId));
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="bg-white border-b border-neutral-200 px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-neutral-800 mb-3">Discover</Text>

        <View className="flex-row items-center border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 mb-3">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-sm text-neutral-800"
            placeholder="Search competitions…"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          <View className="flex-row gap-2 pb-2">
            {COUNTRY_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setCountry(f.value)}
                className={`rounded-full px-3 py-1.5 border ${
                  country === f.value
                    ? 'bg-primary border-primary'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    country === f.value ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={competitions}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-neutral-500 text-sm">No competitions found.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <CompetitionCard
            competition={item}
            showJoinButton
            onJoin={handleJoin}
          />
        )}
      />
    </SafeAreaView>
  );
}
