// Events tab — fetches competition events and renders the events list.
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionEvents, getCompetition } from '@repo/supabase';
import type { Database } from '@repo/types';
import { EventsList } from '@/components/events/EventsList';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface EventsPageProps {
  params: { id: string };
}

export default async function EventsPage({ params }: EventsPageProps) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const [{ data: eventsData, error: eventsError }, { data: competitionData, error: compError }] =
    await Promise.all([
      getCompetitionEvents(client, params.id),
      getCompetition(client, params.id),
    ]);

  if (eventsError || compError || !competitionData) {
    notFound();
  }

  const competition = competitionData as CompetitionRow;
  const isHost =
    competition.host_id === user?.id || competition.cohost_id === user?.id;

  return (
    <EventsList
      events={(eventsData ?? []) as Record<string, unknown>[]}
      isHost={isHost}
      competitionStatus={competition.status}
      competitionId={params.id}
      votingLocked={competition.voting_locked}
    />
  );
}
