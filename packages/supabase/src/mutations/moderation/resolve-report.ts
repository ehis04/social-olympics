// Resolves or dismisses a moderation report (admin client only).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

type ReportAction = 'suspend_host' | 'warn_user' | 'remove_competition' | 'dismiss';

export async function resolveReport(
  adminClient: SupabaseClient,
  reportId: string,
  payload: { action: ReportAction; competition_id?: string },
): Promise<ApiResponse<unknown>> {
  try {
    const newStatus = payload.action === 'dismiss' ? 'dismissed' : 'actioned';

    const { data, error } = await adminClient
      .from('reports')
      .update({
        status: newStatus,
        resolved_at: new Date().toISOString(),
        resolution_action: payload.action,
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    const report = data as { competition_id?: string | null } | null;
    const competitionId = payload.competition_id ?? report?.competition_id ?? undefined;

    // Archive competition if action is remove_competition
    if (payload.action === 'remove_competition' && competitionId) {
      await adminClient
        .from('competitions')
        .update({ status: 'archived' })
        .eq('id', competitionId);
    }

    // suspend_host: flagged in report row for v1 — handled manually

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
