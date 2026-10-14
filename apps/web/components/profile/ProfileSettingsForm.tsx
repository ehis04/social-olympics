/*
 * This file defines the ProfileSettingsForm user-interface component.
 */

// ProfileSettingsForm — editable fields for own profile with validation
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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

// Renders the profile settings form component.
export function ProfileSettingsForm({ profile }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [countryCode, setCountryCode] = useState(profile.country_code ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [favouriteSport, setFavouriteSport] = useState(profile.favourite_sport ?? '');

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
    if (trimmedName.length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    const payload = {
      display_name: trimmedName,
      bio: trimmedBio || null,
      country_code: countryCode || null,
      city: city.trim() || null,
      favourite_sport: favouriteSport.trim() || null,
    };

    updateProfile(
      payload,
      {
        onSuccess: () => {
          toast.success('Profile updated');
          router.refresh();
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to update profile'),
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
          className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-grey-400">{displayName.length}/30</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="block text-sm font-medium text-grey-700">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Tell other competitors a bit about yourself…"
          className="w-full resize-none rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-grey-400">{bio.length}/500</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="country_code" className="block text-sm font-medium text-grey-700">Country</label>
        <select
          id="country_code"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value)}
          className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {COUNTRY_CODES.map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="city" className="block text-sm font-medium text-grey-700">City</label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={60}
            placeholder="e.g. Dublin"
            className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="favourite_sport" className="block text-sm font-medium text-grey-700">Favourite sport</label>
          <input
            id="favourite_sport"
            type="text"
            value={favouriteSport}
            onChange={(e) => setFavouriteSport(e.target.value)}
            maxLength={40}
            placeholder="e.g. Football"
            className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
