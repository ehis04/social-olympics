// Competition event (event-within-a-competition) types.

import type { CompetitionEventStatus, WeightTag } from '../database/enums';
import type { EventWithCategory } from './event';

export interface CompetitionEvent {
  id: string;
  competition_id: string;
  event_id: string;
  status: CompetitionEventStatus;
  weight_tag: WeightTag;
  weight_multiplier: number;
  scheduled_at: string | null;
  sequence_order: number;
  name_override: string | null;
  started_at: string | null;
  confirmed_at: string | null;
}

export type CompetitionEventWithEvent = CompetitionEvent & {
  event: EventWithCategory;
};

export interface WeightConfig {
  weight_tag: WeightTag;
  weight_multiplier: number;
}

export interface CreateCompetitionEventPayload {
  competition_id: string;
  event_id: string;
  weight_tag: WeightTag;
  weight_multiplier: number;
  scheduled_at?: string;
  sequence_order: number;
  name_override?: string;
}

export type UpdateCompetitionEventPayload = Partial<WeightConfig> & {
  scheduled_at?: string;
  sequence_order?: number;
  status?: CompetitionEventStatus;
  name_override?: string;
};
