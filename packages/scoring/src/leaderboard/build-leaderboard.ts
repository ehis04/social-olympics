// Assembles a ranked leaderboard from raw competition member data.
import { calculateMemberScore, type MemberEventResult } from './calculate-member-score';
import { getMedalCounts } from './medal-counts';
import { rankEntries, type RankedEntry } from './rank-entries';

export interface CompetitionMemberInput {
  profileId: string;
  results: MemberEventResult[];
  medalData: Array<{ finishingPlace: number | null }>;
}

export interface LeaderboardEntry extends RankedEntry {
  eventsCompleted: number;
}

export function buildLeaderboard(
  members: CompetitionMemberInput[],
  n: number,
): LeaderboardEntry[] {
  const inputs = members.map((m) => {
    const totalPoints = calculateMemberScore(m.results, n);
    const medals = getMedalCounts(m.medalData);
    const eventsCompleted = m.results.filter((r) => !r.isDnf).length;

    return {
      profileId: m.profileId,
      totalPoints,
      gold: medals.gold,
      silver: medals.silver,
      bronze: medals.bronze,
      eventsCompleted,
    };
  });

  const ranked = rankEntries(inputs);

  return ranked.map((entry) => ({
    ...entry,
    eventsCompleted: inputs.find((i) => i.profileId === entry.profileId)!.eventsCompleted,
  }));
}
