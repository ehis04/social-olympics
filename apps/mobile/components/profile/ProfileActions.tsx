/*
 * This file defines the ProfileActions user-interface component.
 */

// ProfileActions — follow, message, block and report buttons on another person's profile.
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';
import { ReportButton } from '@/components/moderation/ReportButton';

interface Props {
  profileId: string;
  displayName: string;
}

interface FollowState {
  isFollowing: boolean;
  followersCount: number;
}

interface BlockState {
  blocked: boolean;
  blockedEitherWay: boolean;
}

// Renders the profile actions component.
export function ProfileActions({ profileId, displayName }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: follow } = useQuery({
    queryKey: ['follow', profileId],
    queryFn: async () => (await apiCall<FollowState>(`/api/users/${profileId}/follow`)).data,
  });
  const { data: block } = useQuery({
    queryKey: ['block', profileId],
    queryFn: async () => (await apiCall<BlockState>(`/api/users/${profileId}/block`)).data,
  });

  async function toggleFollow() {
    const { data, error } = await apiCall<FollowState>(`/api/users/${profileId}/follow`, {
      method: follow?.isFollowing ? 'DELETE' : 'POST',
    });
    if (error || !data) {
      toast.error(error?.message ?? 'Failed to update follow');
      return;
    }
    queryClient.setQueryData(['follow', profileId], data);
  }

  async function setBlocked(blocked: boolean) {
    const { error } = await apiCall(`/api/users/${profileId}/block`, { method: blocked ? 'POST' : 'DELETE' });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(blocked ? `${displayName} is blocked` : `${displayName} is unblocked`);
    void queryClient.invalidateQueries({ queryKey: ['block', profileId] });
    void queryClient.invalidateQueries({ queryKey: ['follow', profileId] });
    void queryClient.invalidateQueries({ queryKey: ['blocked-people'] });
    void queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }

  function confirmBlock() {
    Alert.alert(
      `Block ${displayName}?`,
      "You won't see their chat messages or comments, and neither of you can send the other a direct message. They won't be told.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => void setBlocked(true) },
      ],
    );
  }

  const canMessage = block ? !block.blockedEitherWay : true;

  return (
    <View className="flex-row flex-wrap items-center gap-2 mb-4">
      {canMessage && (
        <TouchableOpacity
          className={`rounded-lg px-4 py-2 ${follow?.isFollowing ? 'border border-neutral-200' : 'bg-primary'}`}
          onPress={() => void toggleFollow()}
          disabled={!follow}
        >
          <Text className={`text-sm font-semibold ${follow?.isFollowing ? 'text-neutral-700' : 'text-white'}`}>
            {follow?.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}
      {canMessage && (
        <TouchableOpacity
          className="flex-row items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-2"
          onPress={() => router.push(MOBILE_ROUTES.MESSAGE_THREAD(profileId))}
        >
          <MessageCircle size={16} color="#2D6A4F" />
          <Text className="text-sm font-medium text-neutral-700">Message</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        className="border border-neutral-200 rounded-lg px-3 py-2"
        onPress={() => (block?.blocked ? void setBlocked(false) : confirmBlock())}
      >
        <Text className="text-sm font-medium text-neutral-700">{block?.blocked ? 'Unblock' : 'Block'}</Text>
      </TouchableOpacity>
      <ReportButton targetType="profile" targetId={profileId} />
      {follow && canMessage && (
        <Text className="text-xs text-neutral-500">{follow.followersCount} followers</Text>
      )}
    </View>
  );
}
