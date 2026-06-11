// Derives a 1–10 strength rating from historical results using similarity group inference.
import { RESULT_TYPE_CONFIG, SIMILARITY_GROUPS } from '@repo/constants';

export interface HistoricalResult {
  profileId: string;
  eventSlug: string;
  resultValuePrimary: number;
  resultType: string;
}

function isLowerBetter(resultType: string): boolean {
  return RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]?.lowerIsBetter ?? false;
}

function getGroupSlugs(eventSlug: string): string[] {
  for (const group of Object.values(SIMILARITY_GROUPS)) {
    if (group.includes(eventSlug)) return group;
  }
  return [eventSlug]; // standalone: exact match only
}

function relativeScore(value: number, best: number, worst: number, lowerIsBetter: boolean): number {
  if (best === worst) return 0.5; // all identical — mid score
  return lowerIsBetter
    ? (worst - value) / (worst - best)
    : (value - worst) / (best - worst);
}

export function getHistoricalRating(
  targetProfileId: string,
  eventSlug: string,
  allParticipantResults: HistoricalResult[],
): number | null {
  const groupSlugs = getGroupSlugs(eventSlug);
  const groupResults = allParticipantResults.filter((r) => groupSlugs.includes(r.eventSlug));
  const profileResults = groupResults.filter((r) => r.profileId === targetProfileId);

  if (profileResults.length === 0) return null;

  // If the profile is the only participant across all relevant events, return mid-range
  const otherParticipants = groupResults.filter((r) => r.profileId !== targetProfileId);
  if (otherParticipants.length === 0) return 5;

  // Group results by eventSlug to calculate per-event relative scores
  const eventSlugsInGroup = [...new Set(groupResults.map((r) => r.eventSlug))];
  const relativeScores: number[] = [];

  for (const slug of eventSlugsInGroup) {
    const eventResults = groupResults.filter((r) => r.eventSlug === slug);
    const profileEventResults = eventResults.filter((r) => r.profileId === targetProfileId);
    if (profileEventResults.length === 0) continue;

    // If this specific event has only one participant, skip (no comparison possible)
    if (eventResults.length === 1) continue;

    const lowerBetter = isLowerBetter(profileEventResults[0].resultType);
    const values = eventResults.map((r) => r.resultValuePrimary);
    const best = lowerBetter ? Math.min(...values) : Math.max(...values);
    const worst = lowerBetter ? Math.max(...values) : Math.min(...values);

    for (const r of profileEventResults) {
      relativeScores.push(relativeScore(r.resultValuePrimary, best, worst, lowerBetter));
    }
  }

  // If all events had only the target profile as participant, return mid-range
  if (relativeScores.length === 0) return 5;

  const avgScore = relativeScores.reduce((s, v) => s + v, 0) / relativeScores.length;
  const rating = 1 + avgScore * 9;
  return Math.round(Math.min(10, Math.max(1, rating)) * 10) / 10;
}