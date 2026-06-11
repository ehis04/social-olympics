// Public API for the scoring package.
export { calculatePoints } from './points/calculate-points';
export { getParticipationPoints } from './points/participation-points';
export { applyMvpBonus, applyWorstPerformerPenalty } from './points/apply-bonuses';

export { getWeightMultiplier } from './weighting/get-multiplier';
export { validateCustomMultiplier } from './weighting/validate-multiplier';

export { calculateBestOf } from './best-of/calculate-best-of';
export { countEligibleResults } from './best-of/count-eligible';

export { calculateMemberScore } from './leaderboard/calculate-member-score';
export { getMedalCounts } from './leaderboard/medal-counts';
export { rankEntries } from './leaderboard/rank-entries';
export { buildLeaderboard } from './leaderboard/build-leaderboard';

export { checkForTie } from './tiebreakers/check-tie';
export { resolveByMedals } from './tiebreakers/resolve-by-medals';
export { resolveByMargin } from './tiebreakers/resolve-by-margin';

export { calculateTeamStrength } from './team-balance/calculate-team-strength';
export { checkBalanceTolerance } from './team-balance/check-tolerance';
export { scaleUnevenTeam } from './team-balance/scale-uneven-team';
export { getHistoricalRating } from './team-balance/get-historical-rating';
export { balanceTeams } from './team-balance/balance-teams';

export { processBidRound } from './weightlifting/process-bid-round';
export { assignWeightliftingPlaces } from './weightlifting/assign-places';

// Exported types
export type { MedalCounts } from './leaderboard/medal-counts';
export type { RankedEntry, LeaderboardInput } from './leaderboard/rank-entries';
export type { LeaderboardEntry, CompetitionMemberInput } from './leaderboard/build-leaderboard';
export type { MemberEventResult } from './leaderboard/calculate-member-score';
export type { TiebreakerCandidate } from './tiebreakers/resolve-by-medals';
export type { NominationResult } from './tiebreakers/resolve-by-margin';
export type { BalancingResult, PlayerForBalancing } from './team-balance/balance-teams';
export type { ToleranceResult } from './team-balance/check-tolerance';
export type { HistoricalResult } from './team-balance/get-historical-rating';
export type { BidAttempt, BidRoundResult } from './weightlifting/process-bid-round';
export type { EliminationEvent, WeightliftingPlacement } from './weightlifting/assign-places';
