// Discover page — server component that fetches public competitions and the user's joined set
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getServerClient } from '@/lib/supabase/server';
import ROUTES from '@/constants/routes';
import DiscoverGrid from '@/components/competition/DiscoverGrid';
import { getPublicCompetitions, createAdminClient } from '@repo/supabase';
import type { CompetitionSearchParams } from '@repo/supabase';
import type { Database } from '@repo/types';

export const metadata = { title: 'Discover — Social Olympics' };

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface PageProps {
  searchParams: Promise<{ q?: string; country_code?: string; city?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  const filters: CompetitionSearchParams = { limit: 50 };
  if (params.q) filters.q = params.q;
  if (params.country_code) filters.country_code = params.country_code;
  if (params.city) filters.city = params.city;

  const adminClient = createAdminClient();

  const [{ data }, membershipsResult, hostedResult] = await Promise.all([
    getPublicCompetitions(client, filters),
    user
      ? adminClient
          .from('competition_members')
          .select('competition_id')
          .eq('profile_id', user.id)
          .in('status', ['active', 'invited'])
      : Promise.resolve({ data: [] }),
    user
      ? adminClient.from('competitions').select('id').eq('host_id', user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const competitions = (data ?? []) as CompetitionRow[];
  const memberIds = ((membershipsResult.data ?? []) as { competition_id: string }[]).map((m) => m.competition_id);
  const hostedIds = ((hostedResult.data ?? []) as { id: string }[]).map((c) => c.id);
  const joinedIds = new Set([...memberIds, ...hostedIds]);

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

      <DiscoverGrid
        competitions={competitions}
        joinedIds={[...joinedIds]}
        initialQ={params.q ?? ''}
        initialCountryCode={params.country_code ?? ''}
        initialCity={params.city ?? ''}
      />
    </div>
  );
}
