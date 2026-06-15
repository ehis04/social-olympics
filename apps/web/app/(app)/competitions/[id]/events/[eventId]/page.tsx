// Event detail page — server component fetching event, results, and membership context.
import { notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionEvent, getCompetition, getCompetitionMembers, getResultsForEvent } from '@repo/supabase';
import type { Database } from '@repo/types';
import { EventDetail } from '@/components/events/EventDetail';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface EventDetailPageProps {
  params: { id: string; eventId: string };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();

  const [
    { data: eventData, error: eventError },
    { data: competitionData, error: compError },
    { data: membersData },
    { data: resultsData },
  ] = await Promise.all([
    getCompetitionEvent(client, params.eventId),
    getCompetition(client, params.id),
    getCompetitionMembers(client, params.id),
    getResultsForEvent(client, params.eventId),
  ]);

  if (eventError || compError || !eventData || !competitionData) {
    notFound();
  }

  const competition = competitionData as CompetitionRow;
  const members = (membersData ?? []) as MemberRow[];
  const currentMember = members.find((m) => m.profile_id === user?.id) ?? null;
  const isHost = competition.host_id === user?.id || competition.cohost_id === user?.id;
  const memberRole = currentMember?.role ?? null;

  return (
    <EventDetail
      event={eventData as Record<string, unknown>}
      competition={competition}
      results={(resultsData ?? []) as Record<string, unknown>[]}
      members={members as Record<string, unknown>[]}
      currentUserId={user?.id ?? null}
      isHost={isHost}
      memberRole={memberRole}
    />
  );
}
