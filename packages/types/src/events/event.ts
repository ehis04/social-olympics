// Event library entity types.

import type { ResultType } from '../database/enums';

export interface EventCategory {
  id: string;
  slug: string;
  name: string;
  display_order: number;
}

export interface Event {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  result_type: ResultType;
  is_team_event: boolean;
  min_team_size: number | null;
  max_team_size: number | null;
  description: string | null;
  scoring_notes: string | null;
  is_custom: boolean;
  created_by: string | null;
}

export type EventWithCategory = Event & { category: EventCategory };

export interface CreateCustomEventPayload {
  name: string;
  category_id: string;
  result_type: ResultType;
  is_team_event: boolean;
  min_team_size?: number;
  max_team_size?: number;
  description?: string;
  scoring_notes?: string;
}
