/*
 * This file renders the settings application page.
 */

// Settings page — host-only; renders settings form and competition completion controls
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import CompetitionSettingsForm from '@/components/competition/CompetitionSettingsForm';
import { CompetitionEventsManager } from '@/components/competition/CompetitionEventsManager';
import { CompleteCompetitionButton } from '@/components/podium/CompleteCompetitionButton';
import { ArchiveCompetitionButton } from '@/components/podium/ArchiveCompetitionButton';
import { NewSeasonButton } from '@/components/podium/NewSeasonButton';
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

// Renders the settings page component.
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

  const isHost = competition.host_id === user!.id;
  const isFinished = competition.status === 'complete' || competition.status === 'archived';
  const canComplete =
    isHost && competition.status !== 'complete' && competition.status !== 'archived';
  const canArchive = isHost && competition.status === 'complete';
  const { data: nextSeason } = isHost && isFinished
    ? await client
        .from('competitions')
        .select('id, season_number')
        .eq('parent_competition_id', competition.id)
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      {isFinished ? (
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-5 text-sm text-grey-600">
          This competition has finished, so its settings are locked.
        </div>
      ) : (
        <>
          <CompetitionSettingsForm
            competition={competition}
            members={members}
            competitionEvents={competitionEvents}
            isHost={isHost}
          />
          <CompetitionEventsManager
            competitionId={competition.id}
            events={competitionEvents}
            canEdit={!isFinished}
          />
        </>
      )}

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

      {canArchive && (
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-grey-800">Archive competition</h3>
          <p className="mb-4 text-sm text-grey-600">
            Archiving moves this competition to your past competitions. Members can still view the
            results and podium.
          </p>
          <ArchiveCompetitionButton competitionId={competition.id} />
        </div>
      )}

      {isHost && isFinished && (
        <div className="rounded-lg border border-grey-200 bg-white p-5">
          <h3 className="mb-1 text-sm font-semibold text-grey-800">New season</h3>
          <p className="mb-4 text-sm text-grey-600">
            Start a fresh copy of this competition with the same events, points and members. Everyone starts on zero,
            and you can change anything before the first event begins.
          </p>
          <NewSeasonButton competitionId={competition.id} nextSeason={nextSeason} />
        </div>
      )}
    </div>
  );
}
