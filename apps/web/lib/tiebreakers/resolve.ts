/*
 * This file settles a tiebreaker from the two sealed event nominations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveByMargin } from '@repo/scoring';
import type { NominationResult } from '@repo/scoring';

interface TiebreakerRow {
  id: string;
  profile_id_a: string;
  profile_id_b: string;
}

// Compares both players in both nominated events. Returns the winner, or null when still level.
export async function winnerFromNominations(
  adminClient: SupabaseClient,
  tiebreaker: TiebreakerRow,
): Promise<{ ready: boolean; winner: string | null }> {
  const { data: nominations } = await adminClient
    .from('tiebreaker_nominations')
    .select('nominating_profile_id, nominated_event_id')
    .eq('tiebreaker_id', tiebreaker.id);
  if (!nominations || nominations.length < 2) return { ready: false, winner: null };

  const tied = [tiebreaker.profile_id_a, tiebreaker.profile_id_b];
  const nomA = nominations.find((n) => n.nominating_profile_id === tiebreaker.profile_id_a);
  const nomB = nominations.find((n) => n.nominating_profile_id === tiebreaker.profile_id_b);
  if (!nomA || !nomB) return { ready: false, winner: null };

  const eventIds = [nomA.nominated_event_id as string, nomB.nominated_event_id as string];
  const [{ data: results }, { data: events }] = await Promise.all([
    adminClient
      .from('results')
      .select('profile_id, result_value_primary, competition_event_id')
      .in('competition_event_id', eventIds)
      .in('profile_id', tied)
      .not('confirmed_at', 'is', null),
    adminClient.from('competition_events').select('id, events(result_type)').in('id', eventIds),
  ]);

  const valueFor = (profileId: string, eventId: string) =>
    Number((results ?? []).find((r) => r.profile_id === profileId && r.competition_event_id === eventId)?.result_value_primary ?? 0);
  const typeFor = (eventId: string) =>
    ((events ?? []).find((e) => e.id === eventId)?.events as unknown as { result_type: string } | null)?.result_type ?? 'score';

  const resultA: NominationResult = {
    profileId: tiebreaker.profile_id_a,
    nominatedEventId: nomA.nominated_event_id as string,
    resultValuePrimary: valueFor(tiebreaker.profile_id_a, nomA.nominated_event_id as string),
    opponentResultValuePrimary: valueFor(tiebreaker.profile_id_b, nomA.nominated_event_id as string),
    resultType: typeFor(nomA.nominated_event_id as string),
  };
  const resultB: NominationResult = {
    profileId: tiebreaker.profile_id_b,
    nominatedEventId: nomB.nominated_event_id as string,
    resultValuePrimary: valueFor(tiebreaker.profile_id_b, nomB.nominated_event_id as string),
    opponentResultValuePrimary: valueFor(tiebreaker.profile_id_a, nomB.nominated_event_id as string),
    resultType: typeFor(nomB.nominated_event_id as string),
  };

  return { ready: true, winner: resolveByMargin(resultA, resultB) };
}
