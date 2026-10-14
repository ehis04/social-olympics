/*
 * This file defines the profile module.
 */

// Shared profile types for profile pages and components
import type { Database } from '@repo/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type CareerStats = Database['public']['Tables']['career_stats']['Row'];

export interface ProfileWithStats extends ProfileRow {
  career_stats: CareerStats | null;
}

export interface PersonalBest {
  id: string;
  profile_id: string;
  event_id: string;
  result_value_primary: number;
  achieved_at: string;
  events: {
    name: string;
    slug: string;
    result_type: string;
    event_categories: { name: string } | null;
  } | null;
}

export interface MemberResult {
  id: string;
  profile_id: string;
  place: number | null;
  value: number | null;
  points_awarded: number | null;
  status: string;
  competition_events: {
    competition_id: string;
    sequence_order: number;
    events: { name: string; slug: string } | null;
  } | null;
}

// Handles is profile with stats.
export function isProfileWithStats(v: unknown): v is ProfileWithStats {
  return typeof v === 'object' && v !== null && 'id' in v && 'display_name' in v;
}

// Handles is personal best.
export function isPersonalBest(v: unknown): v is PersonalBest {
  return typeof v === 'object' && v !== null && 'event_id' in v && 'result_value_primary' in v;
}

// Handles is member result.
export function isMemberResult(v: unknown): v is MemberResult {
  return typeof v === 'object' && v !== null && 'place' in v && 'competition_events' in v;
}
