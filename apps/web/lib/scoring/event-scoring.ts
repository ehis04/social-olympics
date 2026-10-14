/*
 * This file ranks event results and applies the competition's points table on the server.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PARTICIPATION_POINTS, POINTS_SCALE } from '@repo/constants';

export type PointsTable = Map<number, number>;

export interface PlaceScore {
  points_awarded: number;
  participation_points: number;
}

interface RankableResult {
  id: string;
  profile_id: string;
  team_id: string | null;
  result_value_primary: number | null;
  is_dnf: boolean;
  is_disqualified: boolean;
  confirmed_at: string | null;
}

// Loads the competition's own points table, falling back to the platform defaults.
export async function loadPointsTable(adminClient: SupabaseClient, competitionId: string): Promise<PointsTable> {
  const { data: custom } = await adminClient
    .from('event_points_config')
    .select('finishing_place, points_value')
    .eq('competition_id', competitionId);

  const rows = custom && custom.length > 0
    ? custom
    : (await adminClient
      .from('event_points_config')
      .select('finishing_place, points_value')
      .is('competition_id', null)).data ?? [];

  const table: PointsTable = new Map();
  for (const row of rows) table.set(Number(row.finishing_place), Number(row.points_value));
  if (table.size === 0) {
    for (const [place, points] of Object.entries(POINTS_SCALE)) table.set(Number(place), points);
  }
  return table;
}

// Points for a finishing place. Competitors placed outside the points table still earn
// participation points; DNF, disqualified and unplaced results earn nothing.
export function scoreForPlace(place: number | null, isIneligible: boolean, table: PointsTable): PlaceScore {
  if (isIneligible || place === null) return { points_awarded: 0, participation_points: 0 };
  const points = table.get(place) ?? 0;
  return { points_awarded: points, participation_points: points > 0 ? 0 : PARTICIPATION_POINTS };
}

// Assigns places by value, sharing a place on equal values (1, 1, 3 for individuals).
export function rankByValue<T>(
  entries: T[],
  getValue: (entry: T) => number,
  lowerIsBetter: boolean,
  dense = false,
): Map<T, number> {
  const sorted = [...entries].sort((a, b) =>
    lowerIsBetter ? getValue(a) - getValue(b) : getValue(b) - getValue(a),
  );
  const places = new Map<T, number>();
  let place = 1;
  sorted.forEach((entry, index) => {
    if (index > 0 && getValue(entry) !== getValue(sorted[index - 1]!)) {
      place = dense ? place + 1 : index + 1;
    }
    places.set(entry, place);
  });
  return places;
}

// Recalculates totals for each profile after their results changed.
export async function recalculateScores(
  adminClient: SupabaseClient,
  competitionId: string,
  profileIds: string[],
): Promise<void> {
  await Promise.all(
    [...new Set(profileIds)].map((profileId) =>
      adminClient.rpc('recalculate_member_score', {
        p_profile_id: profileId,
        p_competition_id: competitionId,
      }),
    ),
  );
}

// Re-ranks every result in an event from its values and stores places and points.
// Team events rank teams (every member shares the team's place); individual events rank people.
export async function rerankEvent(
  adminClient: SupabaseClient,
  competitionId: string,
  competitionEventId: string,
  confirmedBy: string,
): Promise<{ error: string | null }> {
  const { data: eventRow, error: eventError } = await adminClient
    .from('competition_events')
    .select('id, events(result_type, is_team_event)')
    .eq('id', competitionEventId)
    .eq('competition_id', competitionId)
    .single();
  if (eventError || !eventRow) return { error: 'Event not found' };

  const library = eventRow.events as unknown as { result_type: string; is_team_event: boolean } | null;
  const resultType = library?.result_type ?? 'score';
  const lowerIsBetter = resultType === 'time' || resultType === 'inverted_score';
  const isTeamEvent = !!library?.is_team_event;

  const { data: resultRows, error: resultsError } = await adminClient
    .from('results')
    .select('id, profile_id, team_id, result_value_primary, is_dnf, is_disqualified, confirmed_at')
    .eq('competition_event_id', competitionEventId);
  if (resultsError) return { error: 'Failed to load results' };

  const results = (resultRows ?? []) as RankableResult[];
  const table = await loadPointsTable(adminClient, competitionId);
  const placeByResult = new Map<string, number | null>();
  const placeByTeam = new Map<string, number>();

  const eligible = results.filter(
    (result) => !result.is_dnf && !result.is_disqualified && result.result_value_primary !== null,
  );

  if (isTeamEvent && eligible.some((result) => result.team_id)) {
    const teamValues = new Map<string, number>();
    for (const result of eligible) {
      if (result.team_id && !teamValues.has(result.team_id)) {
        teamValues.set(result.team_id, Number(result.result_value_primary));
      }
    }
    const teamIds = [...teamValues.keys()];
    const teamPlaces = rankByValue(teamIds, (teamId) => teamValues.get(teamId)!, lowerIsBetter, true);
    for (const [teamId, place] of teamPlaces) placeByTeam.set(teamId, place);
    for (const result of results) {
      placeByResult.set(result.id, result.team_id && !result.is_dnf ? placeByTeam.get(result.team_id) ?? null : null);
    }
  } else {
    const places = rankByValue(eligible, (result) => Number(result.result_value_primary), lowerIsBetter);
    for (const result of results) placeByResult.set(result.id, places.get(result) ?? null);
  }

  const now = new Date().toISOString();
  const updates = await Promise.all(
    results.map((result) => {
      const place = placeByResult.get(result.id) ?? null;
      const score = scoreForPlace(place, result.is_dnf || result.is_disqualified, table);
      return adminClient
        .from('results')
        .update({
          finishing_place: place,
          points_awarded: score.points_awarded,
          participation_points: score.participation_points,
          // Keep the original confirmation time; newly confirmed results fire the scoring trigger.
          ...(result.confirmed_at ? {} : { confirmed_at: now, confirmed_by: confirmedBy }),
        })
        .eq('id', result.id);
    }),
  );
  if (updates.some((update) => update.error)) return { error: 'Failed to update results' };

  if (placeByTeam.size > 0) {
    await Promise.all(
      [...placeByTeam].map(([teamId, place]) =>
        adminClient.from('teams').update({ result_place: place }).eq('id', teamId),
      ),
    );
  }

  await recalculateScores(adminClient, competitionId, results.map((result) => result.profile_id));
  return { error: null };
}
