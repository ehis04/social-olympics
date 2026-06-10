// Event similarity groups used for cross-informing historical strength ratings.

export const SIMILARITY_GROUPS: Record<string, string[]> = {
  sprint: ['100m-sprint', '200m-sprint', '100m-hurdles', '4x100m-relay'],
  middle_distance: ['400m', '400m-hurdles', '800m', '4x400m-relay'],
  swimming: ['25m-swim', '50m-swim', '100m-swim', '4x50m-relay', '4x100m-swim-relay'],
  racket_sports: [
    'tennis-1v1', 'tennis-2v2',
    'badminton-1v1', 'badminton-2v2',
    'paddle-1v1', 'paddle-2v2',
  ],
  weightlifting: ['bench-press', 'deadlift', 'barbell-squat'],
  field_jumps: ['high-jump', 'long-jump', 'triple-jump'],
  field_throws: ['discus-throw', 'hammer-throw'],
  cycling: ['cycling-race', 'individual-time-trial'],
  football: [
    'football-1v1', 'football-2v2', 'football-3v3',
    'football-4v4', 'football-5v5', 'football-6v6',
  ],
  basketball: [
    'basketball-1v1', 'basketball-2v2', 'basketball-3v3',
    'basketball-4v4', 'basketball-5v5',
  ],
  volleyball: ['volleyball-6v6', 'beach-volleyball-2v2'],
  standalone: [
    'golf', 'footgolf', 'archery', 'rock-climbing-speed',
    'rock-climbing-difficulty', 'table-tennis', 'flag-football',
  ],
};

export function getEventSimilarityGroup(eventSlug: string): string | null {
  for (const [group, slugs] of Object.entries(SIMILARITY_GROUPS)) {
    if (slugs.includes(eventSlug)) {
      return group === 'standalone' ? null : group;
    }
  }
  return null;
}

export function getRelatedEventSlugs(eventSlug: string): string[] {
  for (const [group, slugs] of Object.entries(SIMILARITY_GROUPS)) {
    if (slugs.includes(eventSlug) && group !== 'standalone') {
      return slugs.filter((s) => s !== eventSlug);
    }
  }
  return [];
}
