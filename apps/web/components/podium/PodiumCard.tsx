/*
 * This file defines the PodiumCard user-interface component.
 */

// PodiumCard — avatar, name, points and medals for a podium finisher
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';
import { formatPoints } from '@/utils/formatters/points';

interface Props {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string | null;
  totalPoints: number;
  gold: number;
  silver: number;
  bronze: number;
  place: 1 | 2 | 3;
  shared?: boolean;
}

// Handles get flag emoji.
function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

const CROWN: Record<1 | 2 | 3, string> = { 1: '👑', 2: '🥈', 3: '🥉' };

// Renders the podium card component.
export function PodiumCard({
  profileId,
  displayName,
  avatarUrl,
  countryCode,
  totalPoints,
  gold,
  silver,
  bronze,
  place,
  shared = false,
}: Props) {
  const flag = getFlagEmoji(countryCode);

  return (
    <Link href={ROUTES.PROFILE(profileId)} className="flex flex-col items-center gap-1 group">
      <span className="text-2xl">{CROWN[place]}</span>

      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-grey-200 ring-4 ring-white shadow-md group-hover:ring-primary-muted transition-all">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-bold text-grey-400">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="text-center">
        <p className="max-w-[7rem] truncate text-sm font-semibold text-grey-900 group-hover:text-primary-dark">
          {displayName}
          {flag && <span className="ml-1">{flag}</span>}
        </p>
        <p className="font-mono text-xs text-grey-500">{formatPoints(Number(totalPoints))} pts</p>
        {shared && <p className="text-[10px] font-semibold uppercase tracking-wide text-grey-400">Joint place</p>}
        {(gold > 0 || silver > 0 || bronze > 0) && (
          <p className="text-xs text-grey-400">
            {gold > 0 && `🥇${gold} `}
            {silver > 0 && `🥈${silver} `}
            {bronze > 0 && `🥉${bronze}`}
          </p>
        )}
      </div>
    </Link>
  );
}
