// Settings page — host-only; renders settings form and competition completion controls
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import CompetitionSettingsForm from '@/components/competition/CompetitionSettingsForm';
import { CompleteCompetitionButton } from '@/components/podium/CompleteCompetitionButton';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};
type CompetitionEventRow = Database['public']['Tables']['competition_events']['Row'] & {
  event: Database['public']['Tables']['events']['Row'] | null;
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  const { data: compData } = await getCompetition(client, (await params).id);
  if (!compData) return notFound();
  const competition = compData as CompetitionRow;

  if (competition.host_id !== user!.id && competition.cohost_id !== user!.id) {
    redirect(ROUTES.COMPETITION_FEED((await params).id));
  }

  const { data: membersData } = await getCompetitionMembers(client, (await params).id);
  const members = (membersData ?? []) as MemberWithProfile[];

  const { data: eventsData } = await client
    .from('competition_events')
    .select('*, event:events(*)')
    .eq('competition_id', (await params).id)
    .order('sequence_order');
  const competitionEvents = (eventsData ?? []) as CompetitionEventRow[];

  const canComplete =
    competition.status !== 'complete' && competition.status !== 'archived';

  return (
    <div className="space-y-8">
      <CompetitionSettingsForm
        competition={competition}
        members={members}
        competitionEvents={competitionEvents}
      />

      {canComplete && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-red-800">Finalise competition</h3>
          <p className="mb-4 text-sm text-red-700">
            This will lock all results, assign final ranks to every competitor, and reveal the
            podium. This action cannot be undone.
          </p>
          <CompleteCompetitionButton competitionId={competition.id} />
        </div>
      )}
    </div>
  );
}
