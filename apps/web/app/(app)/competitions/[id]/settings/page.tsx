// Settings page — host-only; renders the settings form with current competition data
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import CompetitionSettingsForm from '@/components/competition/CompetitionSettingsForm';
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
  params: { id: string };
}

export default async function SettingsPage({ params }: Props) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) return notFound();
  const competition = compData as CompetitionRow;

  if (competition.host_id !== user!.id) {
    redirect(ROUTES.COMPETITION_FEED(params.id));
  }

  const { data: membersData } = await getCompetitionMembers(client, params.id);
  const members = (membersData ?? []) as MemberWithProfile[];

  const { data: eventsData } = await client
    .from('competition_events')
    .select('*, event:events(*)')
    .eq('competition_id', params.id)
    .order('sequence_order');
  const competitionEvents = (eventsData ?? []) as CompetitionEventRow[];

  return (
    <CompetitionSettingsForm
      competition={competition}
      members={members}
      competitionEvents={competitionEvents}
    />
  );
}
