// Processes a completed weightlifting bid round — updates statuses and assigns places.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';
import { processBidRound as scoringProcessBidRound, assignWeightliftingPlaces } from '@repo/scoring';

interface BidResult {
  profileId: string;
  attemptStatus: 'success' | 'fail' | 'pending' | 'withdrawn';
}

export async function processBidRound(
  adminClient: SupabaseClient,
  competitionEventId: string,
  round: number,
  results: BidResult[],
): Promise<ApiResponse<void>> {
  try {
    // Update attempt_status for each bid in this round
    await Promise.all(
      results.map((r) =>
        adminClient
          .from('weightlifting_bids')
          .update({ attempt_status: r.attemptStatus })
          .eq('competition_event_id', competitionEventId)
          .eq('profile_id', r.profileId)
          .eq('bid_round', round),
      ),
    );

    // Fetch all bids for this event to determine overall eliminations
    const { data: allBids, error: bidsError } = await adminClient
      .from('weightlifting_bids')
      .select('profile_id, bid_weight_kg, attempt_status, bid_round')
      .eq('competition_event_id', competitionEventId)
      .order('bid_round', { ascending: true });

    if (bidsError) return { data: null, error: { code: bidsError.code, message: bidsError.message } };

    const bids = (allBids ?? []) as Array<{
      profile_id: string;
      bid_weight_kg: number;
      attempt_status: string;
      bid_round: number;
    }>;

    // Use scoring package to process this round's bids
    const roundBids = results.map((r) => ({
      profileId: r.profileId,
      bidWeightKg: bids.find((b) => b.profile_id === r.profileId && b.bid_round === round)?.bid_weight_kg ?? 0,
      attemptStatus: r.attemptStatus as 'success' | 'fail' | 'withdrawn',
    }));

    const roundResult = scoringProcessBidRound(roundBids);

    // Build elimination events from all rounds processed so far
    const eliminationsByRound = new Map<number, string[]>();
    for (const bid of bids) {
      if (bid.attempt_status === 'fail') {
        const group = eliminationsByRound.get(bid.bid_round) ?? [];
        if (!group.includes(bid.profile_id)) group.push(bid.profile_id);
        eliminationsByRound.set(bid.bid_round, group);
      }
    }

    const eliminations = Array.from(eliminationsByRound.entries()).map(([r, ids]) => ({
      round: r,
      eliminatedProfileIds: ids,
    }));

    // Assign places to eliminated players in this round
    if (roundResult.eliminated.length > 0) {
      const survivors = roundResult.advancing;
      const placements = assignWeightliftingPlaces(eliminations, survivors);

      await Promise.all(
        placements
          .filter((p) => roundResult.eliminated.includes(p.profileId))
          .map((p) =>
            adminClient.from('results').insert({
              competition_event_id: competitionEventId,
              profile_id: p.profileId,
              finishing_place: p.place,
              submitted_at: new Date().toISOString(),
              confirmed_at: new Date().toISOString(),
            }),
          ),
      );
    }

    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
