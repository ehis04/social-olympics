/*
 * This file defines the index module.
 */

// Profile settings — edit fields + avatar upload via expo-image-picker.
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
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase/client';
import { getProfile, uploadAvatar } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { base64ToBytes } from '@/utils/helpers/base64';
import { useAuthStore } from '@/stores/auth';
import { queryClient as sharedQueryClient } from '@/lib/query-client';
import { unregisterDevicePushToken } from '@/hooks/usePushNotifications';
import { BlockedPeopleSection } from '@/components/profile/BlockedPeopleSection';
import { DeleteAccountSection } from '@/components/profile/DeleteAccountSection';
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

// Opens one of the website's pages, such as the privacy policy, in the browser.
async function openWebPage(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) return;
  await Linking.openURL(`${baseUrl.replace(/\/$/, '')}${path}`).catch(() => null);
}

// Renders the profile settings screen component.
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

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

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photos to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!authProfile?.id) return;
    if (!asset.base64) {
      toast.error('This photo could not be read. Please choose another.');
      return;
    }

    // Edited photos are returned as JPEG; fall back to JPEG when the picker omits the type.
    const contentType = asset.mimeType && asset.mimeType !== 'image/heic' && asset.mimeType !== 'image/heif'
      ? asset.mimeType
      : 'image/jpeg';

    setLocalAvatarUri(asset.uri);
    setUploadingAvatar(true);

    try {
      // React Native blobs upload as empty files, so send the raw bytes with an explicit type.
      const bytes = base64ToBytes(asset.base64);
      const { data, error } = await uploadAvatar(supabase, authProfile.id, bytes, { contentType });
      if (error || !data) {
        toast.error(error?.message ?? 'Failed to upload avatar');
        triggerError();
        setLocalAvatarUri(null);
        return;
      }

      triggerSuccess();
      toast.success('Profile photo updated');
      useAuthStore.getState().setProfile(
        useAuthStore.getState().profile
          ? { ...useAuthStore.getState().profile!, avatar_url: data }
          : null,
      );
      queryClient.invalidateQueries({ queryKey: ['profile', authProfile.id] });
    } catch {
      toast.error('Failed to upload avatar');
      triggerError();
      setLocalAvatarUri(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    if (!authProfile?.id) return;
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
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
    if (error) { toast.error(error.message); triggerError(); return; }
    triggerSuccess();
    toast.success('Profile updated');
    queryClient.invalidateQueries({ queryKey: ['profile', authProfile.id] });
    router.back();
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await unregisterDevicePushToken();
          sharedQueryClient.clear();
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  const avatarUri = localAvatarUri ?? profileData?.avatar_url ?? null;

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
          {/* Avatar picker */}
          <View className="items-center">
            <TouchableOpacity
              className="relative mb-3"
              onPress={handlePickAvatar}
              disabled={uploadingAvatar}
            >
              <View className="w-24 h-24 rounded-full bg-neutral-200 overflow-hidden">
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={{ width: 96, height: 96 }} />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-primary-muted items-center justify-center">
                    <Text className="text-3xl font-bold text-primary">
                      {(displayName[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-2 border-white items-center justify-center">
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Camera size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
            <Text className="text-xs text-neutral-400">Tap to change photo</Text>
          </View>

          <View className="bg-white rounded-lg border border-neutral-200 p-4 gap-4">
            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">
                Display name <Text className="text-error">*</Text>
              </Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
                autoCapitalize="words"
              />
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">Bio</Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={bio}
                onChangeText={setBio}
                maxLength={500}
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
                    className={`px-4 py-2.5 border-b border-neutral-100 ${
                      countryCode === c.value ? 'bg-primary-muted' : ''
                    }`}
                    onPress={() => setCountryCode(c.value)}
                  >
                    <Text
                      className={`text-sm ${
                        countryCode === c.value
                          ? 'text-primary font-semibold'
                          : 'text-neutral-700'
                      }`}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className="text-sm font-semibold text-neutral-700 mb-1">
                Favourite sport
              </Text>
              <TextInput
                className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                value={favouriteSport}
                onChangeText={setFavouriteSport}
                placeholder="e.g. Tennis"
              />
            </View>
          </View>

          <BlockedPeopleSection />

          <TouchableOpacity
            className="rounded-lg border border-red-200 py-3 items-center"
            onPress={handleSignOut}
          >
            <Text className="text-sm font-semibold text-error">Sign Out</Text>
          </TouchableOpacity>

          <DeleteAccountSection />

          <View className="flex-row justify-center gap-4 pb-4">
            <TouchableOpacity onPress={() => void openWebPage('/terms')}>
              <Text className="text-xs text-neutral-400">Terms of Use</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void openWebPage('/privacy')}>
              <Text className="text-xs text-neutral-400">Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
