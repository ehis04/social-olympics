/*
 * This file renders the record application page.
 */

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionEvent, getCompetition, getCompetitionMembers, createAdminClient } from '@repo/supabase';
import ROUTES from '@/constants/routes';
import { EventRecordingFlow } from '@/components/events/recording/EventRecordingFlow';
import { formatResultForInput } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface EventRecordPageProps {
  params: Promise<{ id: string; eventId: string }>;
}

// Renders the event record page component.
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
  if (!['active', 'results_pending'].includes(event.status as string)) {
    redirect(ROUTES.EVENT_DETAIL(id, eventId));
  }

  const rawMembers = (membersData ?? []) as Record<string, unknown>[];
  const members = rawMembers
    .filter((m) => m.status === 'active' && m.role !== 'spectator')
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

  // Results competitors have already submitted are pre-filled so the host can check them.
  const resultType = ((event.events as Record<string, unknown> | null)?.result_type as string) ?? 'score';
  const { data: submittedData } = await adminClient
    .from('results')
    .select('profile_id, result_value_primary, is_dnf, notes')
    .eq('competition_event_id', eventId);
  const initialEntries: Record<string, { value: string; notes: string; isDnf: boolean }> = {};
  for (const row of submittedData ?? []) {
    initialEntries[row.profile_id] = {
      value: row.is_dnf ? '' : formatResultForInput(resultType, row.result_value_primary as number | null),
      notes: row.notes ?? '',
      isDnf: row.is_dnf,
    };
  }

  // Pre-select assigned participants plus anyone who already submitted; with no assignments, everyone.
  const memberIds = new Set(members.map((m) => m.profileId));
  const assignedProfileIds = (assignedData ?? [])
    .map((r) => (r as { profile_id: string }).profile_id)
    .filter((profileId) => memberIds.has(profileId));
  const submittedProfileIds = Object.keys(initialEntries).filter((profileId) => memberIds.has(profileId));
  const defaultSelected = assignedProfileIds.length > 0
    ? [...new Set([...assignedProfileIds, ...submittedProfileIds])]
    : members.map((m) => m.profileId);

  return (
    <EventRecordingFlow
      event={event}
      competition={competition}
      members={members}
      defaultSelectedProfileIds={defaultSelected}
      initialEntries={initialEntries}
      competitionId={id}
      eventId={eventId}
    />
  );
}
