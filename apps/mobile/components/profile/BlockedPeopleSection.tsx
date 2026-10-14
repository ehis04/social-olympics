/*
 * This file defines the BlockedPeopleSection user-interface component.
 */

// BlockedPeopleSection — people the current user has blocked, with unblock buttons.
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface BlockedPerson {
  blocked_id: string;
  profile: { id: string; display_name: string; avatar_url: string | null } | null;
}

// Renders the blocked people section component.
export function BlockedPeopleSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['blocked-people'],
    queryFn: async () => {
      const result = await apiCall<BlockedPerson[]>('/api/users/blocked');
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });

  async function unblock(profileId: string) {
    const { error: unblockError } = await apiCall(`/api/users/${profileId}/block`, { method: 'DELETE' });
    if (unblockError) {
      toast.error(unblockError.message);
      return;
    }
    toast.success('Unblocked');
    void queryClient.invalidateQueries({ queryKey: ['blocked-people'] });
    void queryClient.invalidateQueries({ queryKey: ['block', profileId] });
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 p-4">
      <Text className="text-sm font-semibold text-neutral-800">Blocked people</Text>
      <Text className="text-xs text-neutral-500 mt-1">
        You don&apos;t see their chat messages or comments, and neither of you can message the other.
      </Text>
      {isLoading && <ActivityIndicator className="mt-3" color="#2D6A4F" />}
      {error && <Text className="text-sm text-error mt-3">Blocked people could not be loaded.</Text>}
      {data?.length === 0 && <Text className="text-sm text-neutral-400 mt-3">You haven&apos;t blocked anyone.</Text>}
      {data?.map((person) => (
        <View key={person.blocked_id} className="flex-row items-center justify-between mt-3">
          <Text className="text-sm font-medium text-neutral-800 flex-1" numberOfLines={1}>
            {person.profile?.display_name ?? 'Unknown'}
          </Text>
          <TouchableOpacity
            className="border border-neutral-200 rounded-lg px-3 py-1.5"
            onPress={() => void unblock(person.blocked_id)}
          >
            <Text className="text-sm font-medium text-neutral-700">Unblock</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
