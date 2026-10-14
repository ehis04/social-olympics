/*
 * This file defines the index module.
 */

// Members screen — list with roles, host and co-host management, guests and invite code.
import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Copy, Users } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import * as Clipboard from 'expo-clipboard';
import type { Database } from '@repo/types';

type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};
type MemberRole = Database['public']['Enums']['member_role'];
type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

type Badge = 'host' | MemberRole;

const ROLE_LABELS: Record<Badge, string> = {
  host: 'Host',
  cohost: 'Co-host',
  competitor: 'Competitor',
  spectator: 'Spectator',
};

const ROLE_COLOURS: Record<Badge, string> = {
  host: 'bg-primary-muted text-primary',
  cohost: 'bg-blue-100 text-blue-700',
  competitor: 'bg-neutral-100 text-neutral-600',
  spectator: 'bg-neutral-100 text-neutral-500',
};

// Renders the members screen component.
export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [actionMember, setActionMember] = useState<MemberRow | null>(null);
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

  // People who left stay on the leaderboard with their results, but not in the member list.
  const members = (membersData ?? []).filter((member) => member.status !== 'withdrawn');
  const competition = compData;
  const isHost = competition?.host_id === profile?.id;
  const isCohost = competition?.cohost_id === profile?.id;
  const isFinished = competition?.status === 'complete' || competition?.status === 'archived';
  const canManage = (isHost || isCohost) && !isFinished;
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
    toast.success(newRole === 'cohost' ? 'Co-host appointed' : 'Role updated');
    void queryClient.invalidateQueries({ queryKey: ['competition', id, 'members'] });
    void queryClient.invalidateQueries({ queryKey: ['competition', id] });
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
    if (!canManage || member.profile_id === profile?.id || member.profile_id === competition?.host_id) return;
    setActionMember(member);
  }

  async function shareClaimLink(member: MemberRow) {
    const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
    const link = `${baseUrl}/claim/${member.profile_id}`;
    await Share.share({
      message: `Claim your Social Olympics results for ${competition?.name ?? 'our competition'}: ${link}`,
    });
  }

  // The actions a host or co-host can take on a member, shown in a bottom sheet.
  function memberActions(member: MemberRow): { label: string; destructive?: boolean; run: () => void }[] {
    const isMemberCohost = competition?.cohost_id === member.profile_id;
    const isGuest = !!member.profile?.is_ghost;
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [];
    if (isHost && !isGuest && !isMemberCohost && member.status === 'active') {
      actions.push({ label: 'Make co-host', run: () => void handleRoleChange(member, 'cohost') });
    }
    if (isMemberCohost && isHost) {
      actions.push({ label: 'Remove as co-host', run: () => void handleRoleChange(member, 'competitor') });
    }
    if (!isMemberCohost && member.role !== 'competitor') {
      actions.push({ label: 'Change to competitor', run: () => void handleRoleChange(member, 'competitor') });
    }
    if (!isMemberCohost && member.role !== 'spectator') {
      actions.push({ label: 'Change to spectator', run: () => void handleRoleChange(member, 'spectator') });
    }
    if (isGuest && !member.profile?.claimed_by) {
      actions.push({ label: 'Share claim link', run: () => void shareClaimLink(member) });
    }
    actions.push({ label: 'Remove from competition', destructive: true, run: () => void handleRemove(member) });
    return actions;
  }

  async function handleAddGuest() {
    if (!guestName.trim()) return;
    setAddingGuest(true);
    const { error } = await apiCall(`/api/competitions/${id}/ghost-profile`, {
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
    const badge: Badge = item.profile_id === competition?.host_id
      ? 'host'
      : item.profile_id === competition?.cohost_id
        ? 'cohost'
        : (item.role as MemberRole);
    const roleBadge = ROLE_COLOURS[badge] ?? 'bg-neutral-100 text-neutral-500';
    const isGuest = !!item.profile?.is_ghost;

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-neutral-100"
        onPress={() => router.push(MOBILE_ROUTES.PROFILE(item.profile_id))}
        onLongPress={() => showMemberActions(item)}
        activeOpacity={0.6}
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
            {item.status === 'invited' && (
              <View className="rounded-full bg-amber-100 px-2 py-0.5">
                <Text className="text-xs font-semibold text-amber-700">Invited</Text>
              </View>
            )}
            {isGuest && (
              <View className="rounded-full bg-neutral-100 px-2 py-0.5">
                <Text className="text-xs font-semibold text-neutral-500">Guest</Text>
              </View>
            )}
          </View>
          {item.profile?.country_code ? (
            <Text className="text-xs text-neutral-500">{item.profile.country_code}</Text>
          ) : null}
        </View>

        <View className={`rounded-full px-2 py-0.5 ${roleBadge}`}>
          <Text className="text-xs font-semibold">{ROLE_LABELS[badge] ?? badge}</Text>
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
              {members.length} {members.length === 1 ? 'member' : 'members'}{canManage ? ' · long press to manage' : ''}
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

      {/* Member actions */}
      <Modal visible={actionMember !== null} transparent animationType="slide" onRequestClose={() => setActionMember(null)}>
        <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={() => setActionMember(null)} />
        <View className="bg-white rounded-t-2xl px-6 pt-5 pb-10">
          <Text className="text-base font-bold text-neutral-800 mb-3">
            {actionMember?.profile?.display_name ?? 'Member'}
          </Text>
          {actionMember && memberActions(actionMember).map((action) => (
            <TouchableOpacity
              key={action.label}
              className="py-3.5 border-b border-neutral-100"
              onPress={() => {
                setActionMember(null);
                action.run();
              }}
            >
              <Text className={`text-base ${action.destructive ? 'text-error font-semibold' : 'text-neutral-800'}`}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity className="py-3.5" onPress={() => setActionMember(null)}>
            <Text className="text-base text-neutral-500">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
