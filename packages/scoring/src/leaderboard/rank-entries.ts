// Assigns dense ranks to leaderboard entries, marking ties.
export interface LeaderboardInput {
  profileId: string;
  totalPoints: number;
  gold: number;
  silver: number;
  bronze: number;
}

export interface RankedEntry extends LeaderboardInput {
  rank: number;
  isTied: boolean;
}

export function rankEntries(entries: LeaderboardInput[]): RankedEntry[] {
  if (entries.length === 0) return [];

  const sorted = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    return b.bronze - a.bronze;
  });

  const ranked: RankedEntry[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i] as LeaderboardInput;
    const prev = sorted[i - 1] as LeaderboardInput | undefined;

    if (i > 0 && prev !== undefined && entry.totalPoints !== prev.totalPoints) {
      currentRank++;
    }

    ranked.push({ ...entry, rank: currentRank, isTied: false });
  }

  // Mark entries that share a rank as tied
  const rankGroups = new Map<number, number>();
  for (const e of ranked) {
    rankGroups.set(e.rank, (rankGroups.get(e.rank) ?? 0) + 1);
  }
  for (const e of ranked) {
    if ((rankGroups.get(e.rank) ?? 0) > 1) {
      e.isTied = true;
    }
  }

  return ranked;
}
