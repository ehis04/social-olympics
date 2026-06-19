// Discover page — server component that fetches and renders public competitions
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getServerClient } from '@/lib/supabase/server';
import ROUTES from '@/constants/routes';
import DiscoverCard from '@/components/competition/DiscoverCard';
import CompetitionFeed from '@/components/competition/CompetitionFeed';
import EmptyState from '@/components/ui/EmptyState';
import { Compass } from 'lucide-react';
import { getPublicCompetitions } from '@repo/supabase';
import type { CompetitionSearchParams } from '@repo/supabase';
import type { Database } from '@repo/types';

export const metadata = { title: 'Discover — Social Olympics' };

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface PageProps {
  searchParams: { q?: string; country_code?: string; city?: string };
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const client = await getServerClient();
  const filters: CompetitionSearchParams = { limit: 20 };

  if (searchParams.q) filters.q = searchParams.q;
  if (searchParams.country_code) filters.country_code = searchParams.country_code;
  if (searchParams.city) filters.city = searchParams.city;

  const { data } = await getPublicCompetitions(client, filters);

  const competitions = (data ?? []) as CompetitionRow[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-grey-800">Discover Competitions</h1>
        <Link
          href={ROUTES.CREATE_COMPETITION}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} />
          Create Your Own
        </Link>
      </div>

      <CompetitionFeed
        initialQ={searchParams.q ?? ''}
        initialCountryCode={searchParams.country_code ?? ''}
        initialCity={searchParams.city ?? ''}
      />

      {competitions.length === 0 ? (
        <EmptyState
          icon={Compass}
          heading="No competitions found"
          description={
            searchParams.q
              ? `No public competitions match "${searchParams.q}". Try a different search.`
              : 'No public competitions yet. Be the first to create one!'
          }
          ctaLabel="Create Competition"
          ctaHref={ROUTES.CREATE_COMPETITION}
        />
      ) : (
        <>
          <div className="mb-4 text-sm text-grey-500">
            {competitions.length} competition{competitions.length !== 1 ? 's' : ''} found
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {competitions.map((competition) => (
              <DiscoverCard key={competition.id} competition={competition} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="mb-3 text-sm text-grey-500">
              Don&apos;t see what you&apos;re looking for?
            </p>
            <Link
              href={ROUTES.CREATE_COMPETITION}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Create your own competition →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
