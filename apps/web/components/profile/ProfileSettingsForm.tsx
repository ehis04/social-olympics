// ProfileSettingsForm — editable fields for own profile with validation
'use client';

import { useState, type FormEvent } from 'react';
import { useUpdateProfile } from '@/hooks/profile/useProfile';
import { toast } from '@/lib/toast';
import type { ProfileRow } from '@/types/profile';

interface Props {
  profile: ProfileRow;
}

const COUNTRY_CODES: [string, string][] = [
  ['', 'No country'],
  ['IE', '🇮🇪 Ireland'],
  ['GB', '🇬🇧 United Kingdom'],
  ['US', '🇺🇸 United States'],
  ['AU', '🇦🇺 Australia'],
  ['CA', '🇨🇦 Canada'],
  ['DE', '🇩🇪 Germany'],
  ['FR', '🇫🇷 France'],
  ['ES', '🇪🇸 Spain'],
  ['IT', '🇮🇹 Italy'],
  ['JP', '🇯🇵 Japan'],
  ['BR', '🇧🇷 Brazil'],
  ['ZA', '🇿🇦 South Africa'],
  ['IN', '🇮🇳 India'],
  ['CN', '🇨🇳 China'],
  ['NG', '🇳🇬 Nigeria'],
  ['KE', '🇰🇪 Kenya'],
  ['NZ', '🇳🇿 New Zealand'],
];

export function ProfileSettingsForm({ profile }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [countryCode, setCountryCode] = useState(profile.country_code ?? '');

  const { mutate: updateProfile, isPending } = useUpdateProfile();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Display name is required');
      return;
    }
    if (trimmedName.length > 30) {
      toast.error('Display name must be 30 characters or fewer');
      return;
    }

    const trimmedBio = bio.trim();
    const payload = {
      display_name: trimmedName,
      ...(trimmedBio ? { bio: trimmedBio } : {}),
      ...(countryCode ? { country_code: countryCode } : {}),
    };

    updateProfile(
      payload,
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: () => toast.error('Failed to update profile'),
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="display_name" className="block text-sm font-medium text-grey-700">
          Display name <span className="text-red-500">*</span>
        </label>
        <input
          id="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={30}
          className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p className="text-xs text-grey-400">{displayName.length}/30</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="block text-sm font-medium text-grey-700">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Tell other competitors a bit about yourself…"
          className="w-full resize-none rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <p className="text-xs text-grey-400">{bio.length}/200</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="country_code" className="block text-sm font-medium text-grey-700">Country</label>
        <select
          id="country_code"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          {COUNTRY_CODES.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
