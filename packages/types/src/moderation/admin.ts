// Platform admin action types.

export type AdminAction = 'suspend_host' | 'warn_user' | 'remove_competition' | 'dismiss';

export interface ResolveReportPayload {
  report_id: string;
  action: AdminAction;
  notes?: string;
}
