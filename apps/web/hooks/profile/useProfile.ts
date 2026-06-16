// TanStack Query hooks for profile data, updates, and personal bests
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import { useAuthStore } from '@/stores/auth';
import type { ProfileWithStats, PersonalBest } from '@/types/profile';

// ─── Fetch any profile ────────────────────────────────────────────────────────

async function fetchProfile(profileId: string): Promise<ProfileWithStats> {
  const res = await fetch(`/api/users/${profileId}`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  const json = await res.json() as { data: ProfileWithStats };
  return json.data;
}

export function useProfile(profileId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['profile', profileId],
    queryFn: () => fetchProfile(profileId!),
    enabled: !!session && !!profileId,
    staleTime: 60_000,
  });
}

// ─── Own profile update ───────────────────────────────────────────────────────

interface UpdateProfilePayload {
  display_name?: string;
  bio?: string;
  country_code?: string;
}

async function patchProfile(payload: UpdateProfilePayload): Promise<ProfileWithStats> {
  const res = await fetch('/api/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  const json = await res.json() as { data: ProfileWithStats };
  return json.data;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);

  return useMutation({
    mutationFn: patchProfile,
    onSuccess: (updated) => {
      setProfile(updated);
      void queryClient.invalidateQueries({ queryKey: ['profile', updated.id] });
    },
  });
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

async function uploadAvatarFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Upload failed');
  const json = await res.json() as { data: { avatar_url: string } };
  return json.data.avatar_url;
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setProfile = useAuthStore((s) => s.setProfile);
  const profile = useAuthStore((s) => s.profile);

  return useMutation({
    mutationFn: uploadAvatarFile,
    onSuccess: (avatarUrl) => {
      if (profile) setProfile({ ...profile, avatar_url: avatarUrl });
      void queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

// ─── Personal bests ───────────────────────────────────────────────────────────

async function fetchPersonalBests(profileId: string): Promise<PersonalBest[]> {
  const res = await fetch(`/api/users/${profileId}/personal-bests`);
  if (!res.ok) throw new Error('Failed to fetch personal bests');
  const json = await res.json() as { data: PersonalBest[] };
  return json.data;
}

export function usePersonalBests(profileId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['profile', profileId, 'personal-bests'],
    queryFn: () => fetchPersonalBests(profileId!),
    enabled: !!session && !!profileId,
    staleTime: 120_000,
  });
}
