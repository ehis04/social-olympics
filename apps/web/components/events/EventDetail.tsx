'use client';

// EventDetail — renders event info, results table, and host/competitor action panels.
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { formatResultValue } from '@/utils/formatters/result';
import { formatPoints } from '@/utils/formatters/points';
import { getPlaceSuffix, canSubmitResult } from '@/utils/helpers/results';
import { ResultSubmissionForm } from './ResultSubmissionForm';
import { ConfirmResultsPanel } from './ConfirmResultsPanel';
import { DisputePanel } from './DisputePanel';
import { PerformanceVotePanel } from './PerformanceVotePanel';
import { StrengthVoteWidget } from './StrengthVoteWidget';
import { TeamAssignmentPanel } from './TeamAssignmentPanel';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Competitor {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface TeamMemberRating {
  teamMemberId: string;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  strengthRating: number;
  ratingSource: string;
  submissionRound: 1 | 2;
}

interface RatedPlayer {
  profileId: string;
  displayName: string;
  strengthRating: number;
}

interface AssignedTeam {
  teamId: string;
  members: RatedPlayer[];
}

interface EventDetailProps {
  event: Record<string, unknown>;
  competition: CompetitionRow;
  results: Record<string, unknown>[];
  members: Record<string, unknown>[];
  currentUserId: string | null;
  isHost: boolean;
  memberRole: MemberRole | null;
  pendingStrengthRatings?: TeamMemberRating[];
  ratedPlayers?: RatedPlayer[];
  existingTeams?: AssignedTeam[] | null;
  existingMvpVote?: string | null;
  existingWorstVote?: string | null;
}

function getStatusBanner(status: string) {
  switch (status) {
    case 'active':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          This event is live — results are being collected
        </div>
      );
    case 'results_pending':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm font-medium text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Results submitted — awaiting host confirmation
        </div>
      );
    case 'disputed':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm font-medium text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          A result is under dispute — host is reviewing
        </div>
      );
    case 'confirmed':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Results confirmed
        </div>
      );
    default:
      return null;
  }
}

export function EventDetail({
  event,
  competition,
  results,
  members,
  currentUserId,
  isHost,
  memberRole,
  pendingStrengthRatings = [],
  ratedPlayers = [],
  existingTeams = null,
  existingMvpVote = null,
  existingWorstVote = null,
}: EventDetailProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [showDisputePanel, setShowDisputePanel] = useState<string | null>(null);

  const eventLibrary = event.events as Record<string, unknown> | null;
  const category = eventLibrary?.event_categories as Record<string, unknown> | null;
  const eventName = (event.name_override as string) ?? (eventLibrary?.name as string) ?? 'Event';
  const resultType = (eventLibrary?.result_type as string) ?? 'score';
  const status = event.status as string;
  const competitionEventId = event.id as string;
  const weightTag = (event.weight_tag as string) ?? 'standard';
  const weightMultiplier = (event.weight_multiplier as number) ?? 1;
  const isTeamEvent = !!(event.is_team_event as boolean | undefined);

  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isResultsPending = status === 'results_pending';
  const isConfirmed = status === 'confirmed';

  const canStart = isHost && isPending &&
    ['setup', 'open', 'active'].includes(competition.status);

  const userHasSubmitted = results.some(
    (r) => (r.profiles as Record<string, unknown> | null)?.id === currentUserId ||
      r.profile_id === currentUserId,
  );
  const showSubmit = !isHost && memberRole !== null &&
    canSubmitResult(memberRole, status) && !userHasSubmitted;

  const pendingResults = results.filter((r) => !r.confirmed_at);
  const confirmedResults = results.filter((r) => !!r.confirmed_at);
  const canConfirm = isHost && isResultsPending && pendingResults.length > 0;

  const currentUserResult = results.find(
    (r) => (r.profiles as Record<string, unknown> | null)?.id === currentUserId ||
      r.profile_id === currentUserId,
  );
  const canDispute = !isHost && !!currentUserResult && isResultsPending &&
    event.dispute_window_closes_at != null &&
    new Date(event.dispute_window_closes_at as string) > new Date();

  const showVoting = isConfirmed && memberRole !== null && !isHost;
  const showStrengthVoting = isTeamEvent && isActive && memberRole !== null && !isHost &&
    pendingStrengthRatings.length > 0;
  const showTeamAssignment = isTeamEvent && isHost && isActive;

  const competitors: Competitor[] = members
    .map((m) => {
      const profile = m.profile as Record<string, unknown> | null;
      if (!profile) return null;
      return {
        profileId: profile.id as string,
        displayName: profile.display_name as string,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
      };
    })
    .filter((c): c is Competitor => c !== null);

  async function handleStart() {
    setIsStarting(true);
    try {
      const res = await fetch(
        `/api/competitions/${competition.id}/events/${competitionEventId}/start`,
        { method: 'POST' },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(json.error ?? 'Failed to start event'); return; }
      toast.success('Event started');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link
          href={ROUTES.COMPETITION_EVENTS(competition.id)}
          className="flex items-center gap-1 text-sm text-grey-500 hover:text-grey-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Events
        </Link>
      </div>

      {/* Event header */}
      <div className="rounded-lg border border-grey-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-grey-900">{eventName}</h1>
            <p className="mt-0.5 text-sm text-grey-500 capitalize">
              {category?.name as string} · {resultType.replace('_', ' ')}
              {weightTag !== 'standard' && (
                <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  {weightMultiplier}×
                </span>
              )}
              {isTeamEvent && (
                <span className="ml-2 rounded bg-grey-100 px-1.5 py-0.5 text-xs font-medium text-grey-600">
                  Team event
                </span>
              )}
            </p>
          </div>
          {canStart && (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {isStarting ? 'Starting…' : 'Start Event'}
            </button>
          )}
        </div>
      </div>

      {getStatusBanner(status)}

      {/* Strength voting for peers */}
      {showStrengthVoting && currentUserId && (
        <StrengthVoteWidget
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          pendingRatings={pendingStrengthRatings}
          currentUserId={currentUserId}
        />
      )}

      {/* Team assignment for host */}
      {showTeamAssignment && (
        <TeamAssignmentPanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          ratedPlayers={ratedPlayers}
          existingTeams={existingTeams}
        />
      )}

      {/* Submit result */}
      {showSubmit && !showSubmitForm && (
        <button
          onClick={() => setShowSubmitForm(true)}
          className="w-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          + Submit your result
        </button>
      )}
      {showSubmitForm && (
        <ResultSubmissionForm
          competitionEventId={competitionEventId}
          competitionId={competition.id}
          resultType={resultType}
          onClose={() => setShowSubmitForm(false)}
          onSubmitted={() => { setShowSubmitForm(false); router.refresh(); }}
        />
      )}

      {/* Host confirm panel */}
      {canConfirm && !showConfirmPanel && (
        <button
          onClick={() => setShowConfirmPanel(true)}
          className="w-full rounded-lg border border-yellow-300 bg-yellow-50 py-3 text-sm font-semibold text-yellow-800 hover:bg-yellow-100"
        >
          Review & Confirm Results ({pendingResults.length} pending)
        </button>
      )}
      {showConfirmPanel && (
        <ConfirmResultsPanel
          competitionEventId={competitionEventId}
          competitionId={competition.id}
          results={results}
          resultType={resultType}
          onClose={() => setShowConfirmPanel(false)}
          onConfirmed={() => { setShowConfirmPanel(false); router.refresh(); }}
        />
      )}

      {/* Results table */}
      <div className="rounded-lg border border-grey-200 bg-white overflow-hidden">
        <div className="border-b border-grey-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-grey-700">
            Results {confirmedResults.length > 0 ? `(${confirmedResults.length} confirmed)` : ''}
          </h2>
        </div>
        {results.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-grey-500">No results yet</p>
        ) : (
          <ul className="divide-y divide-grey-100">
            {results.map((result) => {
              const profile = result.profiles as Record<string, unknown> | null;
              const displayName = (profile?.display_name as string) ?? 'Unknown';
              const avatarUrl = profile?.avatar_url as string | null;
              const place = result.finishing_place as number | null;
              const rawValue = result.result_value_primary as number | null;
              const points = result.points_awarded as number | null;
              const confirmed = !!result.confirmed_at;
              const isCurrentUser =
                (profile?.id as string) === currentUserId || result.profile_id === currentUserId;
              const isDisputed = result.disputed_at != null;
              const canDisputeThis =
                !isHost && isCurrentUser && canDispute && confirmed && !isDisputed;

              return (
                <li
                  key={result.id as string}
                  className={`flex items-center gap-3 px-5 py-3 ${isCurrentUser ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-8 text-center">
                    {place != null ? (
                      <span className="text-sm font-bold text-grey-700">{getPlaceSuffix(place)}</span>
                    ) : (
                      <span className="text-xs text-grey-400">—</span>
                    )}
                  </div>
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                      {displayName[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-grey-900">
                      {displayName}
                      {isCurrentUser && <span className="ml-1 text-xs text-grey-400">(you)</span>}
                    </p>
                    {rawValue != null && (
                      <p className="text-xs text-grey-500">{formatResultValue(rawValue, resultType)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {confirmed ? (
                      <>
                        {points != null && (
                          <p className="text-sm font-semibold text-grey-900">{formatPoints(points)} pts</p>
                        )}
                        <p className="text-xs text-green-600">Confirmed</p>
                      </>
                    ) : (
                      <p className="text-xs text-grey-400">Pending</p>
                    )}
                  </div>
                  {canDisputeThis && (
                    <button
                      onClick={() => setShowDisputePanel(result.id as string)}
                      className="ml-2 rounded border border-orange-300 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
                    >
                      Dispute
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Performance voting */}
      {showVoting && currentUserId && (
        <PerformanceVotePanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          competitors={competitors}
          mvpEnabled={competition.mvp_voting_enabled}
          worstPerformerEnabled={competition.worst_performer_enabled}
          currentUserId={currentUserId}
          existingMvpVote={existingMvpVote}
          existingWorstVote={existingWorstVote}
        />
      )}

      {/* Dispute panel */}
      {showDisputePanel && (
        <DisputePanel
          resultId={showDisputePanel}
          onClose={() => setShowDisputePanel(null)}
          onSubmitted={() => { setShowDisputePanel(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
