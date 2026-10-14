/*
 * This file renders the dashboard application page.
 */

// Dashboard — shows the authenticated user's competitions
import Link from 'next/link';
import { Plus, Ticket } from 'lucide-react';
import { getServerClient } from '@/lib/supabase/server';
import ROUTES from '@/constants/routes';
import CompetitionCard from '@/components/competition/CompetitionCard';
import EmptyState from '@/components/ui/EmptyState';
import type { Database } from '@repo/types';
import { createAdminClient, getUserCompetitions } from '@repo/supabase';

export const metadata = { title: 'Dashboard: Social Olympics' };

type CompetitionSummary = Database['public']['Tables']['competitions']['Row'];

// Renders the dashboard page component.
export default async function DashboardPage() {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const adminClient = createAdminClient();
  const { data } = await getUserCompetitions(adminClient, user!.id);
  const competitions = (data ?? []) as CompetitionSummary[];
  const isPast = (competition: CompetitionSummary) =>
    competition.status === 'complete' || competition.status === 'archived';
  const current = competitions.filter((competition) => !isPast(competition));
  const past = competitions.filter(isPast);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-grey-800">My Competitions</h1>
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.JOIN_COMPETITION}
            className="flex items-center gap-1.5 rounded border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-700 hover:border-primary hover:text-primary"
          >
            <Ticket size={16} />
            Join with code
          </Link>
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
          description="Create your own, join with an invite code, or discover public competitions."
          ctaLabel="Create Competition"
          ctaHref={ROUTES.CREATE_COMPETITION}
        />
      ) : (
        <div className="space-y-8">
          {current.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {current.map((competition) => (
                <CompetitionCard key={competition.id} competition={competition} />
              ))}
            </div>
          )}
          {current.length === 0 && (
            <p className="rounded-lg border border-dashed border-grey-200 p-6 text-center text-sm text-grey-500">
              No competitions in progress. Create one or join with an invite code.
            </p>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-grey-400">Past competitions</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {past.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
