'use client';

// Client component that manages search/filter URL state for the discover page
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';


interface Props {
  initialQ: string;
  initialCountryCode: string;
  initialCity: string;
}

export default function CompetitionFeed({ initialQ, initialCountryCode, initialCity }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [city, setCity] = useState(initialCity);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushURL(newQ: string, newCountryCode: string, newCity: string) {
    const params = new URLSearchParams();
    if (newQ) params.set('q', newQ);
    if (newCountryCode) params.set('country_code', newCountryCode);
    if (newCity) params.set('city', newCity);
    router.push(`/competitions/discover?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushURL(q, countryCode, city);
    }, 300);
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

  return (
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

      <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
