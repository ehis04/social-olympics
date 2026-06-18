// Mobile competition header — name, status, meta info, leave button.
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Users, Calendar, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOBILE_ROUTES } from '@/constants/routes';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Props {
  competition: CompetitionRow;
  currentMember: MemberRow | null;
  memberCount: number;
  profileId: string;
}

export function CompetitionHeader({ competition, currentMember, memberCount, profileId }: Props) {
  const router = useRouter();

  const isHost = competition.host_id === profileId;
  const canLeave =
    currentMember &&
    !isHost &&
    competition.status !== 'complete' &&
    competition.status !== 'archived';

  function confirmLeave() {
    Alert.alert(
      'Leave competition',
      'Are you sure you want to leave this competition?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleLeave },
      ]
    );
  }

  async function handleLeave() {
    if (!currentMember) return;
    const { error } = await apiCall(
      `/api/competitions/${competition.id}/members/${currentMember.id}`,
      { method: 'DELETE' }
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('You have left the competition');
    router.replace(MOBILE_ROUTES.DASHBOARD);
  }

  return (
    <View className="bg-white border-b border-neutral-200 px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
            <Text className="text-lg font-bold text-neutral-800 flex-shrink" numberOfLines={2}>
              {competition.name}
            </Text>
            <StatusBadge status={competition.status} />
          </View>

          {competition.description ? (
            <Text className="text-sm text-neutral-600 mb-2" numberOfLines={2}>
              {competition.description}
            </Text>
          ) : null}

          <View className="flex-row flex-wrap gap-3">
            <View className="flex-row items-center gap-1">
              <Users size={13} color="#6B7280" />
              <Text className="text-xs text-neutral-500">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
            {competition.total_events != null && (
              <View className="flex-row items-center gap-1">
                <Calendar size={13} color="#6B7280" />
                <Text className="text-xs text-neutral-500">
                  {competition.total_events} {competition.total_events === 1 ? 'event' : 'events'}
                </Text>
              </View>
            )}
            {(competition.city ?? competition.country_code) ? (
              <View className="flex-row items-center gap-1">
                <MapPin size={13} color="#6B7280" />
                <Text className="text-xs text-neutral-500">
                  {[competition.city, competition.country_code].filter(Boolean).join(', ')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {canLeave ? (
          <TouchableOpacity
            className="border border-neutral-200 rounded-lg px-3 py-1.5"
            onPress={confirmLeave}
          >
            <Text className="text-xs font-semibold text-neutral-600">Leave</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
