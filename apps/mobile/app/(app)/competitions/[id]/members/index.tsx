// Members screen — list with roles, host context menu, invite code display.
import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, Users } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth';
import * as Clipboard from 'expo-clipboard';
import type { Database } from '@repo/types';

type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};
type MemberRole = Database['public']['Enums']['member_role'];
type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

const ROLE_LABELS: Record<MemberRole, string> = {
  cohost: 'Co-host',
  competitor: 'Competitor',
  spectator: 'Spectator',
};

const ROLE_COLOURS: Record<MemberRole, string> = {
  cohost: 'bg-blue-100 text-blue-700',
  competitor: 'bg-neutral-100 text-neutral-600',
  spectator: 'bg-neutral-100 text-neutral-500',
};

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);

  const { data: compData } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const { data: membersData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competition', id, 'members'],
    queryFn: async () => {
      const { data } = await getCompetitionMembers(supabase, id);
      return (data ?? []) as MemberRow[];
    },
    enabled: !!id,
  });

  const members = membersData ?? [];
  const competition = compData;
  const isHost = competition?.host_id === profile?.id;
  const isCohost = competition?.cohost_id === profile?.id;
  const canManage = isHost || isCohost;
  const inviteCode = competition?.invite_code ?? '';

  async function copyInviteCode() {
    await Clipboard.setStringAsync(inviteCode);
    toast.success('Invite code copied!');
  }

  async function handleRoleChange(member: MemberRow, newRole: MemberRole) {
    const { error } = await apiCall(`/api/competitions/${id}/members/${member.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Role updated');
    queryClient.invalidateQueries({ queryKey: ['competition', id, 'members'] });
  }

  async function handleRemove(member: MemberRow) {
    Alert.alert(
      'Remove member',
      `Remove ${member.profile?.display_name ?? 'this member'} from the competition?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await apiCall(
              `/api/competitions/${id}/members/${member.id}`,
              { method: 'DELETE' }
            );
            if (error) {
              toast.error(error.message);
              return;
            }
            toast.success('Member removed');
            queryClient.invalidateQueries({ queryKey: ['competition', id, 'members'] });
          },
        },
      ]
    );
  }

  function showMemberActions(member: MemberRow) {
    if (!canManage || member.profile_id === profile?.id) return;

    const options = ['Change to Competitor', 'Change to Spectator', 'Remove Member', 'Cancel'];
    const destructiveIndex = 2;
    const cancelIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (index) => {
          if (index === 0) handleRoleChange(member, 'competitor');
          if (index === 1) handleRoleChange(member, 'spectator');
          if (index === 2) handleRemove(member);
        }
      );
    } else {
      Alert.alert(member.profile?.display_name ?? 'Member', undefined, [
        { text: 'Change to Competitor', onPress: () => handleRoleChange(member, 'competitor') },
        { text: 'Change to Spectator', onPress: () => handleRoleChange(member, 'spectator') },
        { text: 'Remove Member', style: 'destructive', onPress: () => handleRemove(member) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  async function handleAddGuest() {
    if (!guestName.trim()) return;
    setAddingGuest(true);
    const { error } = await apiCall(`/api/competitions/${id}/members/ghost`, {
      method: 'POST',
      body: JSON.stringify({ display_name: guestName.trim() }),
    });
    setAddingGuest(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Guest added');
    setGuestName('');
    setShowGuestModal(false);
    queryClient.invalidateQueries({ queryKey: ['competition', id, 'members'] });
  }

  function renderMember({ item }: { item: MemberRow }) {
    const isMe = item.profile_id === profile?.id;
    const role = item.role as MemberRole;
    const roleBadge = ROLE_COLOURS[role] ?? 'bg-neutral-100 text-neutral-500';

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-neutral-100"
        onLongPress={() => showMemberActions(item)}
        activeOpacity={canManage && !isMe ? 0.6 : 1}
      >
        <View className="w-10 h-10 rounded-full bg-neutral-200 mr-3 overflow-hidden">
          {item.profile?.avatar_url ? (
            <Image source={{ uri: item.profile.avatar_url }} style={{ width: 40, height: 40 }} />
          ) : (
            <View className="w-10 h-10 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-primary font-bold text-sm">
                {(item.profile?.display_name ?? 'G').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-neutral-800">
              {item.profile?.display_name ?? 'Guest'}
            </Text>
            {isMe && (
              <Text className="text-xs text-neutral-400">(you)</Text>
            )}
          </View>
          {item.profile?.country_code ? (
            <Text className="text-xs text-neutral-500">{item.profile.country_code}</Text>
          ) : null}
        </View>

        <View className={`rounded-full px-2 py-0.5 ${roleBadge}`}>
          <Text className="text-xs font-semibold">{ROLE_LABELS[role] ?? role}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      {/* Invite bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 gap-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2"
          onPress={() => setShowInviteModal(true)}
        >
          <Copy size={14} color="#6B7280" />
          <Text className="text-sm text-neutral-600 font-mono flex-1">{inviteCode || '-'}</Text>
          <Text className="text-xs text-primary font-semibold">Copy</Text>
        </TouchableOpacity>
        {canManage && (
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-primary rounded-lg px-3 py-2"
            onPress={() => setShowGuestModal(true)}
          >
            <UserPlus size={14} color="#fff" />
            <Text className="text-xs font-semibold text-white">Add Guest</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        ListHeaderComponent={
          <View className="px-4 py-2">
            <Text className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              {members.length} {members.length === 1 ? 'member' : 'members'} - long press to manage
            </Text>
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Users size={32} color="#D1D5DB" />
              <Text className="text-neutral-400 mt-3 text-sm">No members yet</Text>
            </View>
          ) : null
        }
      />

      {/* Invite code modal */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowInviteModal(false)}
        />
        <View className="bg-white rounded-t-2xl p-6">
          <Text className="text-base font-bold text-neutral-800 mb-4">Invite to Competition</Text>
          <Text className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">
            Invite code
          </Text>
          <View className="flex-row items-center gap-3 mb-4">
            <Text className="text-2xl font-mono font-bold text-neutral-800 tracking-widest flex-1">
              {inviteCode}
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-lg px-4 py-2"
              onPress={copyInviteCode}
            >
              <Text className="text-white text-sm font-semibold">Copy</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-neutral-400">
            Share this code or use the QR code in your competition settings.
          </Text>
        </View>
      </Modal>

      {/* Add guest modal */}
      <Modal visible={showGuestModal} transparent animationType="slide">
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setShowGuestModal(false)}
        />
        <View className="bg-white rounded-t-2xl p-6">
          <Text className="text-base font-bold text-neutral-800 mb-4">Add Guest</Text>
          <Text className="text-sm text-neutral-600 mb-3">
            Create a guest profile for someone who hasn't signed up yet. They can claim it later.
          </Text>
          <TextInput
            className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50 mb-4"
            placeholder="Guest display name"
            value={guestName}
            onChangeText={setGuestName}
            autoFocus
          />
          <TouchableOpacity
            className="bg-primary rounded-lg py-3 items-center"
            onPress={handleAddGuest}
            disabled={addingGuest}
          >
            {addingGuest ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Add Guest</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
