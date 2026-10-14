/*
 * This file loads tiebreakers for a competition as seen by one viewer.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TiebreakerInfo {
  id: string;
  profileIdA: string;
  profileIdB: string;
  status: 'pending_nomination' | 'nominated' | 'in_progress' | 'resolved';
  resolvedBy: string | null;
  winnerProfileId: string | null;
  viewerNominated: boolean;
  revealedNominations: { profileId: string; eventName: string }[];
  nominatableEvents: { id: string; name: string }[];
}

// Uses the viewer's own client, so sealed nominations stay hidden until both are revealed.
export async function getTiebreakerInfos(
  client: SupabaseClient,
  competitionId: string,
  viewerId: string,
): Promise<TiebreakerInfo[]> {
  const [{ data: eventRows }, { data: tiebreakerRows }] = await Promise.all([
    client.from('competition_events').select('id, status, name_override, events(name)').eq('competition_id', competitionId),
    client
      .from('tiebreakers')
      .select('id, profile_id_a, profile_id_b, status, resolved_by, winner_profile_id, tiebreaker_nominations(nominating_profile_id, nominated_event_id, revealed_at)')
      .eq('competition_id', competitionId),
  ]);

  const events = eventRows ?? [];
  const eventNames = new Map(events.map((event) => [
    event.id as string,
    (event.name_override as string | null) ?? (event.events as unknown as { name: string } | null)?.name ?? 'Event',
  ]));
  const confirmedEventIds = events.filter((event) => event.status === 'confirmed').map((event) => event.id as string);

  const infos: TiebreakerInfo[] = [];
  for (const row of tiebreakerRows ?? []) {
    const involved = [row.profile_id_a as string, row.profile_id_b as string];
    let nominatable: { id: string; name: string }[] = [];

    // Events where both tied players have confirmed results can be nominated.
    if (involved.includes(viewerId) && ['pending_nomination', 'nominated'].includes(row.status as string) && confirmedEventIds.length > 0) {
      const { data: shared } = await client
        .from('results')
        .select('profile_id, competition_event_id')
        .in('profile_id', involved)
        .in('competition_event_id', confirmedEventIds)
        .not('confirmed_at', 'is', null)
        .not('result_value_primary', 'is', null);
      const byEvent = new Map<string, Set<string>>();
      for (const result of shared ?? []) {
        const profiles = byEvent.get(result.competition_event_id as string) ?? new Set<string>();
        profiles.add(result.profile_id as string);
        byEvent.set(result.competition_event_id as string, profiles);
      }
      nominatable = [...byEvent]
        .filter(([, profiles]) => profiles.size === 2)
        .map(([eventId]) => ({ id: eventId, name: eventNames.get(eventId) ?? 'Event' }));
    }

    const nominations = (row.tiebreaker_nominations as unknown as {
      nominating_profile_id: string;
      nominated_event_id: string;
      revealed_at: string | null;
    }[] | null) ?? [];

    infos.push({
      id: row.id as string,
      profileIdA: row.profile_id_a as string,
      profileIdB: row.profile_id_b as string,
      status: row.status as TiebreakerInfo['status'],
      resolvedBy: (row.resolved_by as string | null) ?? null,
      winnerProfileId: (row.winner_profile_id as string | null) ?? null,
      viewerNominated: nominations.some((nomination) => nomination.nominating_profile_id === viewerId),
      revealedNominations: nominations
        .filter((nomination) => nomination.revealed_at)
        .map((nomination) => ({
          profileId: nomination.nominating_profile_id,
          eventName: eventNames.get(nomination.nominated_event_id) ?? 'Event',
        })),
      nominatableEvents: nominatable,
    });
  }
  return infos;
}
