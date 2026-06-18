// Profile settings screen — edit display name, bio, country, city; avatar picker in Branch 5.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft, Camera } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getProfile } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess } from '@/utils/helpers/haptics';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const COUNTRY_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Ireland', value: 'IE' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'United States', value: 'US' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Italy', value: 'IT' },
  { label: 'Australia', value: 'AU' },
  { label: 'Canada', value: 'CA' },
];

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { profile: authProfile } = useAuthStore();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [favouriteSport, setFavouriteSport] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ['profile', authProfile?.id],
    queryFn: async () => {
      const { data } = await getProfile(supabase, authProfile?.id ?? '');
      return data as ProfileRow | null;
    },
    enabled: !!authProfile?.id,
  });

  useEffect(() => {
    if (profileData) {
      setDisplayName(profileData.display_name ?? '');
      setBio(profileData.bio ?? '');
      setCity(profileData.city ?? '');
      setCountryCode(profileData.country_code ?? '');
      setFavouriteSport(profileData.favourite_sport ?? '');
    }
  }, [profileData]);

  async function handleSave() {
    if (!authProfile?.id) return;
    setSaving(true);
    const { error } = await apiCall('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        city: city.trim() || null,
        country_code: countryCode || null,
        favourite_sport: favouriteSport.trim() || null,
      }),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    triggerSuccess();
    toast.success('Profile updated');
    queryClient.invalidateQueries({ queryKey: ['profile', authProfile.id] });
    router.back();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800 flex-1">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#2D6A4F" size="small" />
          ) : (
            <Text className="text-primary font-semibold text-sm">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerClassName="p-4 gap-5" keyboardShouldPersistTaps="handled">
          {/* Avatar placeholder — picker wired in Branch 5 */}
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-neutral-200 overflow-hidden mb-3">
              {profileData?.avatar_url ? (
                <Image source={{ uri: profileData.avatar_url }} style={{ width: 96, height: 96 }} />
              ) : (
                <View className="w-24 h-24 rounded-full bg-primary-muted items-center justify-center">
                  <Text className="text-3xl font-bold text-primary">
                    {(displayName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              className="flex-row items-center gap-1.5 border border-neutral-200 rounded-lg px-4 py-2"
              onPress={() => toast.info('Avatar picker coming in next update')}
            >
              <Camera size={16} color="#6B7280" />
              <Text className="text-sm text-neutral-600">Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-lg border border-neutral-200 p-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">Display name</Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={40}
                autoCapitalize="words"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">Bio</Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={bio}
                onChangeText={setBio}
                maxLength={200}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholder="Tell people about yourself…"
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

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-2">Country</Text>
              <ScrollView
                className="border border-neutral-200 rounded-lg bg-neutral-50 max-h-32"
                nestedScrollEnabled
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <TouchableOpacity
                    key={c.value}
                    className={`px-4 py-2.5 border-b border-neutral-100 ${countryCode === c.value ? 'bg-primary-muted' : ''}`}
                    onPress={() => setCountryCode(c.value)}
                  >
                    <Text className={`text-sm ${countryCode === c.value ? 'text-primary font-semibold' : 'text-neutral-700'}`}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">Favourite sport</Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={favouriteSport}
                onChangeText={setFavouriteSport}
                placeholder="e.g. Tennis"
              />
            </View>
          </View>

          {/* Sign out */}
          <TouchableOpacity
            className="rounded-lg border border-red-200 py-3 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-sm font-semibold text-error">Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
