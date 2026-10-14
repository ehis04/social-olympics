/*
 * This file defines the CompetitionHeader user-interface component.
 */

// Mobile competition header — name, status, meta info, and join, accept, leave and report actions.
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Users, Calendar, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ReportButton } from '@/components/moderation/ReportButton';
import { MOBILE_ROUTES } from '@/constants/routes';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Props {
  competition: CompetitionRow;
  currentMember: MemberRow | null;
  activeMemberCount: number;
  profileId: string;
}

// Renders the competition header component.
export function CompetitionHeader({ competition, currentMember, activeMemberCount, profileId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isJoining, setIsJoining] = useState(false);

  const isHost = competition.host_id === profileId;
  const isFinished = competition.status === 'complete' || competition.status === 'archived';
  const isActiveMember = currentMember?.status === 'active';
  const isInvited = currentMember?.status === 'invited';
  const canLeave = isActiveMember && !isHost && !isFinished;
  // Anyone can join a public competition; invited people accept from here.
  const canJoin = !isFinished && !isActiveMember && (isInvited || competition.is_public);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['competition', competition.id] });
    void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
  }

  async function handleJoin() {
    setIsJoining(true);
    const { data, error } = await apiCall<{ alreadyMember?: boolean; role?: string }>(
      `/api/competitions/${competition.id}/members`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    setIsJoining(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.role === 'spectator') toast.success('Joined as a spectator: the competition has already started');
    else toast.success(isInvited ? 'Invitation accepted' : 'Joined competition!');
    refresh();
  }

  function confirmLeave() {
    Alert.alert(
      'Leave competition',
      'You will stop competing, but any results you have already earned stay on the leaderboard. You can rejoin later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => void handleLeave() },
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
    refresh();
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
            {(competition.season_number ?? 1) > 1 && (
              <View className="rounded-full bg-neutral-100 px-2 py-0.5">
                <Text className="text-xs font-semibold text-neutral-600">Season {competition.season_number}</Text>
              </View>
            )}
            {!competition.is_public && (
              <View className="rounded-full bg-neutral-100 px-2 py-0.5">
                <Text className="text-xs font-semibold text-neutral-600">Private</Text>
              </View>
            )}
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
                {activeMemberCount} {activeMemberCount === 1 ? 'member' : 'members'}
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

        <View className="items-end gap-2">
          {canJoin ? (
            <TouchableOpacity
              className="bg-primary rounded-lg px-3 py-1.5"
              onPress={() => void handleJoin()}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-xs font-semibold text-white">{isInvited ? 'Accept invite' : 'Join'}</Text>
              )}
            </TouchableOpacity>
          ) : null}
          {canLeave ? (
            <TouchableOpacity
              className="border border-neutral-200 rounded-lg px-3 py-1.5"
              onPress={confirmLeave}
            >
              <Text className="text-xs font-semibold text-neutral-600">Leave</Text>
            </TouchableOpacity>
          ) : null}
          {!isHost && <ReportButton targetType="competition" targetId={competition.id} compact />}
        </View>
      </View>
    </View>
  );
}
