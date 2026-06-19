// Competition settings screen — host-only; form fields, QR invite code, and completion danger zone.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCompetition } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { InviteQRCode } from '@/components/competition/InviteQRCode';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: compData, isLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (compData) {
      setName(compData.name ?? '');
      setDescription(compData.description ?? '');
      setIsPublic(compData.is_public ?? true);
      setCity(compData.city ?? '');
    }
  }, [compData]);

  const isHost = compData?.host_id === profile?.id;
  const canComplete =
    compData?.status !== 'complete' && compData?.status !== 'archived';

  if (!isHost) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <Text className="text-neutral-500 text-sm">Only the host can access settings</Text>
      </View>
    );
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await apiCall(`/api/competitions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        ...(city.trim() && { city: city.trim() }),
      }),
    });
    setSaving(false);
    if (error) { toast.error(error.message); triggerError(); return; }
    triggerSuccess();
    toast.success('Settings saved');
    queryClient.invalidateQueries({ queryKey: ['competition', id] });
  }

  function confirmComplete() {
    Alert.alert(
      'Finalise competition',
      'This will lock all results, assign final ranks, and reveal the podium. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Finalise', style: 'destructive', onPress: handleComplete },
      ]
    );
  }

  async function handleComplete() {
    setCompleting(true);
    const { error } = await apiCall(`/api/competitions/${id}/complete`, { method: 'POST' });
    setCompleting(false);
    if (error) { toast.error(error.message); triggerError(); return; }
    triggerSuccess();
    toast.success('Competition finalised!');
    queryClient.invalidateQueries({ queryKey: ['competition', id] });
    router.push(MOBILE_ROUTES.COMPETITION_PODIUM(id));
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50">
        <ActivityIndicator color="#2D6A4F" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView contentContainerClassName="p-4 gap-5">
        {/* Basic settings */}
        <View className="bg-white rounded-lg border border-neutral-200 p-4 gap-4">
          <Text className="text-sm font-bold text-neutral-800">Basic Info</Text>

          <View>
            <Text className="text-sm font-semibold text-neutral-700 mb-1">Name</Text>
            <TextInput
              className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-neutral-700 mb-1">Description</Text>
            <TextInput
              className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View>
            <Text className="text-sm font-semibold text-neutral-700 mb-1">City</Text>
            <TextInput
              className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Dublin"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-neutral-800">Public</Text>
              <Text className="text-xs text-neutral-500">Visible on Discover page</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#2D6A4F' }} />
          </View>
        </View>

        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* QR invite code */}
        {compData?.invite_code ? (
          <View className="bg-white rounded-lg border border-neutral-200 p-5">
            <Text className="text-sm font-bold text-neutral-800 mb-4">Invite Players</Text>
            <InviteQRCode
              inviteCode={compData.invite_code}
            />
          </View>
        ) : null}

        {/* Danger zone */}
        {canComplete && (
          <View className="rounded-lg border border-red-200 bg-red-50 p-4">
            <Text className="text-sm font-semibold text-red-800 mb-1">Finalise competition</Text>
            <Text className="text-sm text-red-700 mb-4">
              This will lock all results, assign final ranks to every competitor, and reveal the
              podium. This action cannot be undone.
            </Text>
            <TouchableOpacity
              className="bg-error rounded-lg py-3 items-center"
              onPress={confirmComplete}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Finalise Competition</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
