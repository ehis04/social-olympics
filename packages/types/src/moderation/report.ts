// Content moderation report types.

import type { ReportStatus, ReportTargetType } from '../database/enums';
import type { ProfileSummary } from '../users/profile';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface CreateReportPayload {
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
}

export type ModerationQueueItem = Report & {
  reporter: ProfileSummary;
  target_summary: string;
};
