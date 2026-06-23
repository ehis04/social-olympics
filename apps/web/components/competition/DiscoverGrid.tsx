'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Compass } from 'lucide-react';
import DiscoverCard from '@/components/competition/DiscoverCard';
import EmptyState from '@/components/ui/EmptyState';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competitions: CompetitionRow[];
  joinedIds: string[];
  initialQ: string;
  initialCountryCode: string;
  initialCity: string;
}

export default function DiscoverGrid({
  competitions,
  joinedIds,
  initialQ,
  initialCountryCode,
  initialCity,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [city, setCity] = useState(initialCity);
  const [hideJoined, setHideJoined] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);
  const joinedSet = new Set(joinedIds);

  function pushURL(newQ: string, newCountryCode: string, newCity: string) {
    const params = new URLSearchParams();
    if (newQ) params.set('q', newQ);
    if (newCountryCode) params.set('country_code', newCountryCode);
    if (newCity) params.set('city', newCity);
    const qs = params.toString();
    router.push(`/competitions/discover${qs ? `?${qs}` : ''}`);
  }

  useEffect(() => {
    // Skip the initial render — the server already loaded the correct results
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushURL(q, countryCode, city);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, countryCode, city]);

  function clearSearch() {
    setQ('');
    setCountryCode('');
    setCity('');
    router.push('/competitions/discover');
  }

  const hasFilters = q || countryCode || city;

  const visible = hideJoined
    ? competitions.filter((c) => !joinedSet.has(c.id))
    : competitions;

  const joinedCount = competitions.filter((c) => joinedSet.has(c.id)).length;

  return (
    <>
      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400" />
          <input
            type="text"
            placeholder="Search competitions…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-grey-200 bg-white py-2.5 pl-9 pr-4 text-sm text-grey-800 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-grey-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All countries</option>
            <option value="IE">Ireland</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="AU">Australia</option>
            <option value="CA">Canada</option>
          </select>

          <input
            type="text"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="rounded-lg border border-grey-200 bg-white px-3 py-2 text-sm text-grey-700 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {hasFilters && (
            <button
              onClick={clearSearch}
              className="text-sm font-semibold text-grey-500 hover:text-grey-700"
            >
              Clear
            </button>
          )}

          {/* Hide joined toggle — only shown if the user has joined at least one */}
          {joinedCount > 0 && (
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-grey-600">
              <span>Hide joined</span>
              <button
                type="button"
                role="switch"
                aria-checked={hideJoined}
                onClick={() => setHideJoined((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${hideJoined ? 'bg-primary' : 'bg-grey-300'}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    hideJoined ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      {/* Results count */}
      {competitions.length > 0 && (
        <p className="mb-4 text-sm text-grey-500">
          {visible.length} competition{visible.length !== 1 ? 's' : ''}
          {hideJoined && joinedCount > 0 ? ` (${joinedCount} joined hidden)` : ''}
        </p>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Compass}
          heading={hideJoined ? 'No other competitions found' : 'No competitions found'}
          description={
            hideJoined
              ? "You've joined all available competitions, or none match your search."
              : q
              ? `No public competitions match "${q}". Try a different search.`
              : 'No public competitions yet. Be the first to create one!'
          }
          ctaLabel="Create Competition"
          ctaHref={ROUTES.CREATE_COMPETITION}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visible.map((competition) => (
              <DiscoverCard
                key={competition.id}
                competition={competition}
                isJoined={joinedSet.has(competition.id)}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="mb-3 text-sm text-grey-500">
              Don&apos;t see what you&apos;re looking for?
            </p>
            <a href={ROUTES.CREATE_COMPETITION} className="text-sm font-semibold text-primary hover:underline">
              Create your own competition →
            </a>
          </div>
        </>
      )}
    </>
  );
}
