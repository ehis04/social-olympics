// Dashboard — shows the authenticated user's competitions
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getServerClient } from '@/lib/supabase/server';
import ROUTES from '@/constants/routes';
import CompetitionCard from '@/components/competition/CompetitionCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Database } from '@repo/types';
import { getUserCompetitions } from '@repo/supabase';

export const metadata = { title: 'Dashboard — Social Olympics' };

type CompetitionSummary = Database['public']['Tables']['competitions']['Row'];

export default async function DashboardPage() {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data } = await getUserCompetitions(client, user!.id);
  const competitions = (data ?? []) as CompetitionSummary[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-grey-800">My Competitions</h1>
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.DISCOVER}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Discover
          </Link>
          <Link
            href={ROUTES.CREATE_COMPETITION}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} />
            Create Competition
          </Link>
        </div>
      </div>

      {competitions.length === 0 ? (
        <EmptyState
          heading="No competitions yet"
          description="Create your own or discover public competitions to join."
          ctaLabel="Create Competition"
          ctaHref={ROUTES.CREATE_COMPETITION}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {competitions.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      )}
    </div>
  );
}
