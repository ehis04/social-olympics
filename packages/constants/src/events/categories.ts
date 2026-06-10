// All 16 event category slugs and their display names.

export const EVENT_CATEGORY_SLUGS = [
  'track',
  'swimming',
  'field',
  'football',
  'basketball',
  'racket_sports',
  'volleyball',
  'weightlifting',
  'cycling',
  'rock_climbing',
  'golf',
  'footgolf',
  'archery',
  'table_tennis',
  'flag_football',
  'other',
] as const;

export type EventCategorySlug = (typeof EVENT_CATEGORY_SLUGS)[number];

export const CATEGORY_DISPLAY_NAMES: Record<EventCategorySlug, string> = {
  track: 'Track',
  swimming: 'Swimming',
  field: 'Field',
  football: 'Football',
  basketball: 'Basketball',
  racket_sports: 'Racket Sports',
  volleyball: 'Volleyball',
  weightlifting: 'Weightlifting',
  cycling: 'Cycling',
  rock_climbing: 'Rock Climbing',
  golf: 'Golf',
  footgolf: 'Footgolf',
  archery: 'Archery',
  table_tennis: 'Table Tennis',
  flag_football: 'Flag Football',
  other: 'Other',
};
