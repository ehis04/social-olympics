'use client';

// ModerationQueue — tabbed admin view for reviewing and actioning reports
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from '@/lib/toast';

type ReportAction = 'suspend_host' | 'warn_user' | 'remove_competition' | 'dismiss';

interface Reporter {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Report {
  id: string;
  target_type: string;
  target_id: string;
  competition_id: string | null;
  reason: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_action: string | null;
  reporter: Reporter | null;
}

interface Props {
  initialPending: Report[];
  initialActioned: Report[];
}

type Tab = 'pending' | 'actioned';

const ACTION_LABELS: Record<ReportAction, string> = {
  dismiss: 'Dismiss',
  warn_user: 'Warn user',
  suspend_host: 'Suspend host',
  remove_competition: 'Remove competition',
};

const ACTION_STYLES: Record<ReportAction, string> = {
  dismiss: 'border-grey-200 text-grey-600 hover:bg-grey-50',
  warn_user: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
  suspend_host: 'border-orange-300 text-orange-700 hover:bg-orange-50',
  remove_competition: 'border-red-300 text-red-700 hover:bg-red-50',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ReportCard({ report, onAction }: { report: Report; onAction: (id: string, action: ReportAction, competitionId?: string) => Promise<void> }) {
  const [resolving, setResolving] = useState<ReportAction | null>(null);
  const isPending = report.status === 'pending';

  async function handleAction(action: ReportAction) {
    setResolving(action);
    await onAction(
      report.id,
      action,
      action === 'remove_competition' ? (report.competition_id ?? undefined) : undefined,
    );
    setResolving(null);
  }

  const availableActions: ReportAction[] = report.target_type === 'competition'
    ? ['remove_competition', 'warn_user', 'dismiss']
    : ['warn_user', 'suspend_host', 'dismiss'];

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-grey-100 px-2 py-0.5 text-xs font-semibold text-grey-600 capitalize">
              {report.target_type.replace('_', ' ')}
            </span>
            {!isPending && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 capitalize">
                {report.resolution_action?.replace('_', ' ') ?? 'resolved'}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-grey-800">{report.reason}</p>
          <p className="text-xs text-grey-500">
            Reported by{' '}
            <span className="font-semibold">{report.reporter?.display_name ?? 'Unknown'}</span>
            {' '}· {timeAgo(report.created_at)}
          </p>
          {report.competition_id && (
            <p className="text-xs text-grey-400">Competition ID: {report.competition_id}</p>
          )}
        </div>
        {isPending && (
          <AlertTriangle size={16} className="shrink-0 text-yellow-500 mt-0.5" />
        )}
        {!isPending && (
          <CheckCircle size={16} className="shrink-0 text-green-500 mt-0.5" />
        )}
      </div>

      {isPending && (
        <div className="flex flex-wrap gap-2 border-t border-grey-100 pt-3">
          {availableActions.map((action) => (
            <button
              key={action}
              onClick={() => void handleAction(action)}
              disabled={resolving !== null}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${ACTION_STYLES[action]}`}
            >
              {resolving === action ? 'Applying…' : ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModerationQueue({ initialPending, initialActioned }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<Report[]>(initialPending);
  const [actioned, setActioned] = useState<Report[]>(initialActioned);

  async function handleAction(reportId: string, action: ReportAction, competitionId?: string) {
    try {
      const res = await fetch(`/api/moderation/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, competition_id: competitionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to action report');
        return;
      }

      const resolved = pending.find((r) => r.id === reportId);
      if (resolved) {
        setPending((prev) => prev.filter((r) => r.id !== reportId));
        setActioned((prev) => [
          { ...resolved, status: 'actioned', resolution_action: action, resolved_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      toast.success(`Report ${action === 'dismiss' ? 'dismissed' : 'actioned'}`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg border border-grey-200 p-0.5 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={[
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'pending' ? 'bg-primary text-white' : 'text-grey-600 hover:text-grey-900',
          ].join(' ')}
        >
          <Clock size={14} />
          Pending
          {pending.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${tab === 'pending' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('actioned')}
          className={[
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            tab === 'actioned' ? 'bg-primary text-white' : 'text-grey-600 hover:text-grey-900',
          ].join(' ')}
        >
          <CheckCircle size={14} />
          Actioned
        </button>
      </div>

      {tab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 py-16 text-center">
              <CheckCircle size={28} className="mx-auto mb-3 text-green-400" />
              <p className="text-sm font-semibold text-grey-600">No pending reports</p>
              <p className="mt-1 text-xs text-grey-400">All reports have been reviewed</p>
            </div>
          ) : (
            pending.map((report) => (
              <ReportCard key={report.id} report={report} onAction={handleAction} />
            ))
          )}
        </div>
      )}

      {tab === 'actioned' && (
        <div className="space-y-3">
          {actioned.length === 0 ? (
            <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 py-16 text-center">
              <p className="text-sm text-grey-500">No actioned reports yet</p>
            </div>
          ) : (
            actioned.map((report) => (
              <ReportCard key={report.id} report={report} onAction={handleAction} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
