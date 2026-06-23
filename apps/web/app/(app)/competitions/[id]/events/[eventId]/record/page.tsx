import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionEvent, getCompetition, getCompetitionMembers, createAdminClient } from '@repo/supabase';
import ROUTES from '@/constants/routes';
import { EventRecordingFlow } from '@/components/events/recording/EventRecordingFlow';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface EventRecordPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

export default async function EventRecordPage({ params }: EventRecordPageProps) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();

  const [
    { data: eventData, error: eventError },
    { data: competitionData, error: compError },
    { data: membersData },
    { data: assignedData },
  ] = await Promise.all([
    getCompetitionEvent(client, eventId),
    getCompetition(client, id),
    getCompetitionMembers(client, id),
    // Use user-scoped client — host RLS allows this read
    client
      .from('competition_event_participants')
      .select('profile_id')
      .eq('competition_event_id', eventId),
  ]);

  const adminClient = createAdminClient();

  if (eventError || compError || !eventData || !competitionData) {
    redirect(ROUTES.EVENT_DETAIL(id, eventId));
  }

  const competition = competitionData as CompetitionRow;
  const isHost = competition.host_id === user?.id || competition.cohost_id === user?.id;
  if (!isHost) {
    redirect(ROUTES.EVENT_DETAIL(id, eventId));
  }

  const event = eventData as Record<string, unknown>;
  if ((event.status as string) !== 'active') {
    redirect(ROUTES.EVENT_DETAIL(id, eventId));
  }

  const rawMembers = (membersData ?? []) as Record<string, unknown>[];
  const members = rawMembers
    .filter((m) => m.status === 'active')
    .map((m) => {
      const profile = (m.profile ?? m.profiles) as Record<string, unknown> | null;
      return {
        profileId: m.profile_id as string,
        displayName: (profile?.display_name as string) ?? 'Unknown',
        avatarUrl: (profile?.avatar_url as string | null) ?? null,
      };
    });

  // Include the host in the participant list if they're not already a competition member
  if (user && !members.some((m) => m.profileId === user.id)) {
    const { data: hostProfile } = await adminClient
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.id)
      .single();
    if (hostProfile) {
      members.unshift({
        profileId: hostProfile.id,
        displayName: hostProfile.display_name ?? 'Host',
        avatarUrl: hostProfile.avatar_url ?? null,
      });
    }
  }

  // Pre-select assigned participants; fall back to all members if none assigned
  const assignedProfileIds = (assignedData ?? []).map((r) => (r as { profile_id: string }).profile_id);
  const defaultSelected = assignedProfileIds.length > 0 ? assignedProfileIds : members.map((m) => m.profileId);

  return (
    <EventRecordingFlow
      event={event}
      competition={competition}
      members={members}
      defaultSelectedProfileIds={defaultSelected}
      competitionId={id}
      eventId={eventId}
    />
  );
}
