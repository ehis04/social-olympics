// Checks whether two ranked leaderboard entries are tied.
import type { RankedEntry } from '../leaderboard/rank-entries';

export function checkForTie(entryA: RankedEntry, entryB: RankedEntry): boolean {
  return entryA.isTied && entryB.isTied && entryA.rank === entryB.rank;
}
