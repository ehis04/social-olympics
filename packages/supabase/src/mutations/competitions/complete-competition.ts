/*
 * This file defines the complete competition module.
 */

// Marks a competition complete and writes final_rank to all members (admin only).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

interface RankableMember {
  id: string;
  profile_id: string;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
}

export interface TiebreakerOutcome {
  winner: string;
  loser: string;
}

// Handles same standing.
function sameStanding(a: RankableMember, b: RankableMember): boolean {
  return Number(a.total_points) === Number(b.total_points) &&
    a.gold_count === b.gold_count &&
    a.silver_count === b.silver_count &&
    a.bronze_count === b.bronze_count;
}

// Orders members by points then medals; settled tiebreakers separate otherwise-equal members.
// Ranks are dense: members who remain level share a rank and the next rank follows on.
export function rankMembersForCompletion(
  members: RankableMember[],
  tiebreakers: TiebreakerOutcome[] = [],
): Map<string, number> {
  const sorted = [...members].sort((a, b) =>
    Number(b.total_points) - Number(a.total_points) ||
    b.gold_count - a.gold_count ||
    b.silver_count - a.silver_count ||
    b.bronze_count - a.bronze_count,
  );

  const groups: RankableMember[][] = [];
  for (const member of sorted) {
    const last = groups[groups.length - 1];
    if (last && sameStanding(last[0]!, member)) last.push(member);
    else groups.push([member]);
  }

  const ranks = new Map<string, number>();
  let rank = 1;
  for (const group of groups) {
    const ids = new Set(group.map((member) => member.profile_id));
    const winsFor = (profileId: string) => tiebreakers.filter(
      (outcome) => outcome.winner === profileId && ids.has(outcome.loser),
    ).length;
    const ordered = [...group].sort((a, b) => winsFor(b.profile_id) - winsFor(a.profile_id));
    ordered.forEach((member, index) => {
      if (index > 0 && winsFor(member.profile_id) !== winsFor(ordered[index - 1]!.profile_id)) rank++;
      ranks.set(member.id, rank);
    });
    rank++;
  }
  return ranks;
}

// Handles complete competition.
export async function completeCompetition(
  adminClient: SupabaseClient,
  id: string,
  options: { tiebreakers?: TiebreakerOutcome[] } = {},
): Promise<ApiResponse<unknown>> {
  try {
    const { data: members, error: membersError } = await adminClient
      .from('competition_members')
      .select('id, profile_id, total_points, gold_count, silver_count, bronze_count')
      .eq('competition_id', id)
      .eq('status', 'active')
      .eq('role', 'competitor');

    if (membersError) return { data: null, error: { code: membersError.code, message: membersError.message } };

    const ranks = rankMembersForCompletion((members ?? []) as RankableMember[], options.tiebreakers);
    for (const [memberId, finalRank] of ranks) {
      const { error } = await adminClient
        .from('competition_members')
        .update({ final_rank: finalRank })
        .eq('id', memberId);
      if (error) return { data: null, error: { code: error.code, message: error.message } };
    }

    const { data: competition, error } = await adminClient.from('competitions')
      .update({ status: 'complete', completed_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: competition, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
