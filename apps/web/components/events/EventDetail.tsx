/*
 * This file defines the EventDetail user-interface component.
 */

'use client';

// EventDetail — renders event info, results table, and host/competitor action panels.
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Play, CheckCircle, AlertTriangle, ChevronLeft, Ban } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { formatResultValue } from '@repo/scoring';
import { formatPoints } from '@/utils/formatters/points';
import { getPlaceSuffix, canSubmitResult } from '@/utils/helpers/results';
import { ResultSubmissionForm } from './ResultSubmissionForm';
import { ConfirmResultsPanel } from './ConfirmResultsPanel';
import { DisputePanel } from './DisputePanel';
import { PerformanceVotePanel } from './PerformanceVotePanel';
import { TeamEventPanel } from './TeamEventPanel';
import { HostEventManagementPanel } from './HostEventManagementPanel';
import { HostDisputePanel, type OpenDispute } from './HostDisputePanel';
import { EventAwardsPanel, type AwardWinner } from './EventAwardsPanel';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import type { TeamEventState } from '@/lib/teams/team-event';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Competitor {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface EventDetailProps {
  event: Record<string, unknown>;
  competition: CompetitionRow;
  results: Record<string, unknown>[];
  members: Record<string, unknown>[];
  currentUserId: string | null;
  isHost: boolean;
  memberRole: MemberRole | null;
  existingMvpVote?: string | null;
  existingWorstVote?: string | null;
  mvpAward?: AwardWinner | null;
  worstAward?: AwardWinner | null;
  ballotCounts?: { mvp: number; worst: number } | null;
  teamState?: TeamEventState | null;
  openDisputes?: OpenDispute[];
}

// Handles get status banner.
function getStatusBanner(status: string, cancelledReason: string | null) {
  switch (status) {
    case 'active':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          This event is live: results are being collected
        </div>
      );
    case 'results_pending':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm font-medium text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Results submitted: awaiting host confirmation
        </div>
      );
    case 'disputed':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm font-medium text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          A result is under dispute: host is reviewing
        </div>
      );
    case 'confirmed':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Results confirmed
        </div>
      );
    case 'cancelled':
      return (
        <div className="flex items-center gap-2 rounded-lg bg-grey-50 border border-grey-200 px-4 py-3 text-sm font-medium text-grey-700">
          <Ban className="h-4 w-4 shrink-0" />
          This event was cancelled{cancelledReason ? `: ${cancelledReason}` : ''}
        </div>
      );
    case 'pending':
      return (
        <div className="rounded-lg bg-grey-50 border border-grey-200 px-4 py-3 text-sm text-grey-600">
          Upcoming: results can be entered once the host starts this event.
        </div>
      );
    default:
      return null;
  }
}

// Renders the event detail component.
export function EventDetail({
  event,
  competition,
  results,
  members,
  currentUserId,
  isHost,
  memberRole,
  existingMvpVote = null,
  existingWorstVote = null,
  mvpAward = null,
  worstAward = null,
  ballotCounts = null,
  teamState = null,
  openDisputes = [],
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
  const isTeamEvent = !!(eventLibrary?.is_team_event as boolean | undefined);
  const scheduledAt = (event.scheduled_at as string | null | undefined) ?? null;
  const eventLocation = (event.location as string | null | undefined) ?? null;
  const eventDetails = (event.details as string | null | undefined) ?? null;

  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isResultsPending = status === 'results_pending';
  const isConfirmed = status === 'confirmed';
  const isDisputed = status === 'disputed';
  const isCancelled = status === 'cancelled';
  const competitionFinished = competition.status === 'complete' || competition.status === 'archived';
  const hasTeams = (teamState?.teams.length ?? 0) > 0;
  const isActiveCompetitor = memberRole === 'competitor';

  const canStart = isHost && isPending && !competitionFinished &&
    ['setup', 'open', 'active'].includes(competition.status);

  const userHasSubmitted = results.some(
    (r) => (r.profiles as Record<string, unknown> | null)?.id === currentUserId ||
      r.profile_id === currentUserId,
  );
  // Team results are entered per team by the host once teams exist.
  const showSubmit = !isHost && memberRole !== null && !competitionFinished &&
    canSubmitResult(memberRole, status) && !userHasSubmitted && !(isTeamEvent && hasTeams);

  const pendingResults = results.filter((r) => !r.confirmed_at);
  const confirmedResults = results.filter((r) => !!r.confirmed_at);
  const canConfirm = isHost && isResultsPending && pendingResults.length > 0 && !(isTeamEvent && hasTeams);
  const submittedProfileIds = results
    .map((result) => result.profile_id as string | undefined)
    .filter((profileId): profileId is string => Boolean(profileId));

  const currentUserResult = results.find(
    (r) => (r.profiles as Record<string, unknown> | null)?.id === currentUserId ||
      r.profile_id === currentUserId,
  );
  const disputeWindowOpen = event.dispute_window_closes_at != null &&
    new Date(event.dispute_window_closes_at as string) > new Date();
  const canDispute = !isHost && !!currentUserResult && (isConfirmed || isDisputed) &&
    !competitionFinished && disputeWindowOpen;

  const mvpOpen = competition.mvp_voting_enabled && !mvpAward;
  const worstOpen = competition.worst_performer_enabled && !worstAward;
  const showVoting = isConfirmed && isActiveCompetitor && !competitionFinished && (mvpOpen || worstOpen);
  const showAwards = (isConfirmed || isDisputed) && (competition.mvp_voting_enabled || competition.worst_performer_enabled);
  const showTeamPanel = isTeamEvent && !isCancelled && !!teamState;

  const competitors: Competitor[] = members
    .map((m) => {
      const profile =
        (m.profile as Record<string, unknown> | null) ??
        (m.profiles as Record<string, unknown> | null);
      if (!profile) return null;
      return {
        profileId: profile.id as string,
        displayName: profile.display_name as string,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
      };
    })
    .filter((c): c is Competitor => c !== null);
  const participantOptions = competitors.filter((competitor) => {
    const member = members.find((m) => m.profile_id === competitor.profileId);
    return member?.status === 'active' && member?.role !== 'spectator';
  });
  const resultProfileIds = new Set(submittedProfileIds);
  const voteCandidates = competitors.filter((competitor) => resultProfileIds.has(competitor.profileId));

  async function handleStart() {
    setIsStarting(true);
    try {
      const res = await fetch(
        `/api/competitions/${competition.id}/events/${competitionEventId}/start`,
        { method: 'POST' },
      );
      if (!res.ok) { toast.error(getApiErrorMessage(await readJson(res), 'Failed to start event')); return; }
      if (!isTeamEvent) {
        router.push(ROUTES.EVENT_RECORD(competition.id, competitionEventId));
      } else {
        router.refresh();
      }
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
          {isHost && (isActive || isResultsPending) && !isTeamEvent && !competitionFinished && (
            <Link
              href={ROUTES.EVENT_RECORD(competition.id, competitionEventId)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Record Results
            </Link>
          )}
        </div>
      </div>

      {getStatusBanner(status, (event.cancelled_reason as string | null) ?? null)}

      {isHost && !isConfirmed && !isDisputed && !isCancelled && !competitionFinished && (
        <HostEventManagementPanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          resultType={resultType}
          status={status}
          scheduledAt={scheduledAt}
          location={eventLocation}
          details={eventDetails}
          members={participantOptions}
          submittedProfileIds={submittedProfileIds}
          onSaved={() => router.refresh()}
          showResultEntry={isTeamEvent && !hasTeams && !(teamState?.pool.length)}
        />
      )}

      {(scheduledAt || eventLocation || eventDetails) && (
        <section className="rounded-lg border border-grey-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-grey-900">Event information</h2>
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            {scheduledAt && (
              <div>
                <dt className="font-medium text-grey-500">Scheduled start</dt>
                <dd className="mt-0.5 text-grey-900">
                  {new Date(scheduledAt).toLocaleString()}
                </dd>
              </div>
            )}
            {eventLocation && (
              <div>
                <dt className="font-medium text-grey-500">Location</dt>
                <dd className="mt-0.5 text-grey-900">{eventLocation}</dd>
              </div>
            )}
            {eventDetails && (
              <div className="md:col-span-3">
                <dt className="font-medium text-grey-500">Details</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-grey-900">{eventDetails}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Host dispute review */}
      {isHost && openDisputes.length > 0 && (
        <HostDisputePanel competitionId={competition.id} resultType={resultType} disputes={openDisputes} />
      )}

      {/* Team events: ratings, balancing and team results */}
      {showTeamPanel && teamState && (
        <TeamEventPanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          state={teamState}
          viewerId={currentUserId}
          isHost={isHost && !competitionFinished}
          isCompetitor={isActiveCompetitor}
          eventStatus={status}
          resultType={resultType}
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
              // Points shown are what counts towards the total: place points, participation and event weight.
              const points = result.points_awarded == null
                ? null
                : (Number(result.points_awarded) + Number(result.participation_points ?? 0)) * Number(weightMultiplier);
              const confirmed = !!result.confirmed_at;
              const isCurrentUser =
                (profile?.id as string) === currentUserId || result.profile_id === currentUserId;
              const disputes = (result.result_disputes as { status: string; reason?: string }[] | null) ?? [];
              const openDispute = disputes.find((d) => d.status === 'open');
              const resultDisputed = !!openDispute;
              const canDisputeThis =
                !isHost && isCurrentUser && canDispute && confirmed && !resultDisputed;
              const teamName = (result.teams as { name?: string } | null)?.name ?? null;
              const isDnf = !!result.is_dnf;

              return (
                <li
                  key={result.id as string}
                  className={`flex items-center gap-3 px-5 py-3 ${isCurrentUser ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-8 text-center">
                    {place != null ? (
                      <span className="text-sm font-bold text-grey-700">{getPlaceSuffix(place)}</span>
                    ) : (
                      <span className="text-xs text-grey-400">-</span>
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
                    <p className="text-xs text-grey-500">
                      {isDnf ? <span className="font-semibold text-red-600">DNF</span> : rawValue != null && formatResultValue(rawValue, resultType)}
                      {teamName && <span className="ml-1.5 rounded bg-grey-100 px-1.5 py-0.5 text-grey-600">{teamName}</span>}
                      {resultDisputed && (
                        <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700">Disputed</span>
                      )}
                    </p>
                    {resultDisputed && isCurrentUser && openDispute?.reason && (
                      <p className="mt-0.5 text-xs text-orange-700">Your dispute: “{openDispute.reason}”</p>
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

      {/* Awards */}
      {showAwards && (
        <EventAwardsPanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          mvpEnabled={competition.mvp_voting_enabled}
          worstEnabled={competition.worst_performer_enabled}
          mvp={mvpAward}
          worst={worstAward}
          isHost={isHost}
          canFinalise={isConfirmed && !competitionFinished}
          ballotCounts={ballotCounts}
        />
      )}

      {/* Performance voting */}
      {showVoting && currentUserId && (
        <PerformanceVotePanel
          competitionId={competition.id}
          competitionEventId={competitionEventId}
          competitors={voteCandidates}
          mvpEnabled={mvpOpen}
          worstPerformerEnabled={worstOpen}
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
