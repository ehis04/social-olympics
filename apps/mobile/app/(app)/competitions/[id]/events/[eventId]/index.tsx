/*
 * This file defines the index module.
 */

// Event detail screen — results, submission, host recording and confirmation, disputes, teams and awards.
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle, AlertTriangle, ChevronLeft, XCircle, ClipboardList } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import {
  getCompetitionEvent,
  getCompetition,
  getCompetitionMembers,
  getResultsForEvent,
} from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ResultSubmissionForm } from '@/components/events/ResultSubmissionForm';
import { ConfirmResultsPanel } from '@/components/events/ConfirmResultsPanel';
import { TeamEventPanel, type TeamEventState } from '@/components/events/TeamEventPanel';
import { PerformanceVotePanel } from '@/components/events/PerformanceVotePanel';
import { HostRecorderPanel } from '@/components/events/HostRecorderPanel';
import { HostDisputePanel, type OpenDispute } from '@/components/events/HostDisputePanel';
import { EventAwardsPanel } from '@/components/events/EventAwardsPanel';
import { MOBILE_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';
import { formatResultValue } from '@/utils/formatters/result';
import { formatPoints } from '@/utils/formatters/points';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];
type ResultType = Database['public']['Enums']['result_type'];
type CompetitionEventStatus = Database['public']['Enums']['competition_event_status'];

interface ResultRow {
  id: string;
  profile_id: string | null;
  result_value_primary: number | null;
  is_dnf: boolean | null;
  notes: string | null;
  points_awarded: number | null;
  finishing_place: number | null;
  confirmed_at: string | null;
  submitted_at: string | null;
  result_disputes: { id: string; status: string; reason: string; created_at: string }[] | null;
  profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

interface CompetitionEvent {
  id: string;
  status: CompetitionEventStatus | null;
  weight_tag: string | null;
  weight_multiplier: number | null;
  is_team_event: boolean | null;
  name_override: string | null;
  dispute_window_closes_at: string | null;
  voting_window_closes_at: string | null;
  events: {
    name: string | null;
    result_type: ResultType | null;
    is_team_event: boolean | null;
    event_categories: { name: string | null } | null;
  } | null;
}

// Handles get place suffix.
function getPlaceSuffix(place: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${place}${suffixes[place] ?? 'th'}`;
}

// Handles can submit result.
function canSubmitResult(role: MemberRole, status: string): boolean {
  return (role === 'competitor' || role === 'cohost') && ['active', 'results_pending'].includes(status);
}

// Renders the event detail screen component.
export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [disputeResultId, setDisputeResultId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);

  const { data: eventData, isLoading: eventLoading, refetch: refetchEvent, isRefetching } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const { data } = await getCompetitionEvent(supabase, eventId);
      return data as CompetitionEvent | null;
    },
    enabled: !!eventId,
  });

  const { data: competitionData } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['competition', id, 'members'],
    queryFn: async () => {
      const { data } = await getCompetitionMembers(supabase, id);
      return (data ?? []) as MemberRow[];
    },
    enabled: !!id,
  });

  const { data: resultsData, refetch: refetchResults } = useQuery({
    queryKey: ['event', eventId, 'results'],
    queryFn: async () => {
      const { data } = await getResultsForEvent(supabase, eventId);
      return (data ?? []) as ResultRow[];
    },
    enabled: !!eventId,
  });

  // People the host assigned to this event; used to pre-select them when recording.
  const { data: assignedIds } = useQuery({
    queryKey: ['event', eventId, 'participants'],
    queryFn: async () => {
      const { data } = await supabase
        .from('competition_event_participants')
        .select('profile_id')
        .eq('competition_event_id', eventId);
      return (data ?? []).map((row) => row.profile_id as string);
    },
    enabled: !!eventId,
  });

  // Team events load their player pool, ratings and teams from the web API.
  const { data: teamState, refetch: refetchTeams } = useQuery({
    queryKey: ['event', eventId, 'teams'],
    queryFn: async () => {
      const { data } = await apiCall<TeamEventState>(`/api/competitions/${id}/events/${eventId}/teams`);
      return data;
    },
    enabled: !!eventData?.events?.is_team_event,
  });

  function refetchAll() {
    refetchEvent();
    refetchResults();
    refetchTeams();
    void queryClient.invalidateQueries({ queryKey: ['competition', id, 'events'] });
    void queryClient.invalidateQueries({ queryKey: ['event', eventId, 'awards'] });
    void queryClient.invalidateQueries({ queryKey: ['competition', id, 'leaderboard'] });
  }

  if (eventLoading || !eventData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  const event = eventData;
  const competition = competitionData;
  const members = membersData ?? [];
  const results = resultsData ?? [];

  const currentMember = members.find((m) => m.profile_id === profile?.id) ?? null;
  const memberRole = currentMember?.role as MemberRole | null;
  const isHost =
    competition?.host_id === profile?.id || competition?.cohost_id === profile?.id;

  const eventName = event.name_override ?? event.events?.name ?? 'Event';
  const resultType = event.events?.result_type ?? 'score';
  const category = event.events?.event_categories?.name ?? '';
  const status = event.status ?? 'pending';
  const isTeamEvent = event.events?.is_team_event ?? false;

  const isPending = status === 'pending';
  const isActive = status === 'active';
  const isResultsPending = status === 'results_pending';
  const isConfirmed = status === 'confirmed';

  const canStart =
    isHost && isPending && ['setup', 'open', 'active'].includes(competition?.status ?? '');

  const userHasSubmitted = results.some(
    (r) => r.profiles?.id === profile?.id || r.profile_id === profile?.id
  );
  const showSubmit =
    !isHost &&
    memberRole !== null &&
    canSubmitResult(memberRole, status) &&
    !userHasSubmitted;

  const pendingResults = results.filter((r) => !r.confirmed_at);
  const canConfirm = isHost && isResultsPending && pendingResults.length > 0;

  const currentUserResult = results.find(
    (r) => r.profiles?.id === profile?.id || r.profile_id === profile?.id
  );
  const disputeWindowOpen =
    event.dispute_window_closes_at != null &&
    new Date(event.dispute_window_closes_at) > new Date();
  // Disputes are raised against confirmed results while the dispute window is open.
  const canDispute =
    !isHost &&
    !!currentUserResult?.confirmed_at &&
    (isConfirmed || status === 'disputed') &&
    disputeWindowOpen &&
    !(currentUserResult?.result_disputes ?? []).some((d) => d.status === 'open');

  const isLiveEvent = isActive || isResultsPending;
  const isCancelled = status === 'cancelled';
  const competitionFinished = competition?.status === 'complete' || competition?.status === 'archived';
  const hasTeams = (teamState?.teams.length ?? 0) > 0;

  const showPerformanceVoting = isConfirmed && memberRole === 'competitor';
  const showTeamPanel = isTeamEvent && !!teamState && !isCancelled;
  // Hosts record everyone's results for individual events, or for team events before teams are formed.
  const canRecord = isHost && isLiveEvent && !hasTeams && !competitionFinished;
  const canCancel = isHost && !competitionFinished && !['confirmed', 'cancelled', 'disputed'].includes(status);

  const openDisputes: OpenDispute[] = isHost
    ? results.flatMap((result) =>
        (result.result_disputes ?? [])
          .filter((dispute) => dispute.status === 'open')
          .map((dispute) => ({
            disputeId: dispute.id,
            displayName: result.profiles?.display_name ?? 'Unknown',
            reason: dispute.reason,
            raisedAt: dispute.created_at,
            resultValue: result.result_value_primary,
            isDnf: !!result.is_dnf,
            place: result.finishing_place,
          })),
      )
    : [];

  const competitors = members
    .filter((m) => m.status === 'active' && m.role !== 'spectator')
    .map((m) => {
      const mp = m as unknown as { profile: { id: string; display_name: string; avatar_url: string | null } | null };
      if (!mp.profile) return null;
      return {
        profileId: mp.profile.id,
        displayName: mp.profile.display_name,
        avatarUrl: mp.profile.avatar_url,
      };
    })
    .filter((c): c is { profileId: string; displayName: string; avatarUrl: string | null } => c !== null);

  async function handleStart() {
    setIsStarting(true);
    const { error } = await apiCall(
      `/api/competitions/${id}/events/${eventId}/start`,
      { method: 'POST' }
    );
    setIsStarting(false);
    if (error) { toast.error(error.message); triggerError(); return; }
    triggerSuccess();
    toast.success('Event started');
    refetchAll();
  }

  const recorderParticipants = competitors.map((c) => ({ profileId: c.profileId, displayName: c.displayName }));
  const recorderExisting = results
    .filter((r) => r.profile_id)
    .map((r) => ({ profileId: r.profile_id!, value: r.result_value_primary, isDnf: !!r.is_dnf, notes: r.notes }));
  const competitorIds = new Set(recorderParticipants.map((p) => p.profileId));
  const assigned = (assignedIds ?? []).filter((profileId) => competitorIds.has(profileId));
  const recorderDefaults = assigned.length > 0
    ? [...new Set([...assigned, ...recorderExisting.map((e) => e.profileId).filter((profileId) => competitorIds.has(profileId))])]
    : recorderParticipants.map((p) => p.profileId);

  function confirmCancel() {
    Alert.alert(
      'Cancel this event?',
      'It will not count towards anyone\u2019s score and members will be told. This cannot be undone.',
      [
        { text: 'Keep event', style: 'cancel' },
        {
          text: 'Cancel event',
          style: 'destructive',
          onPress: async () => {
            const { error } = await apiCall(`/api/competitions/${id}/events/${eventId}/cancel`, {
              method: 'POST',
              body: JSON.stringify({}),
            });
            if (error) { toast.error(error.message); return; }
            toast.success('Event cancelled');
            refetchAll();
          },
        },
      ],
    );
  }

  async function handleDispute(resultId: string) {
    setDisputeReason('');
    setDisputeResultId(resultId);
  }

  async function submitDispute() {
    if (!disputeResultId || !disputeReason.trim()) return;
    setIsDisputing(true);
    const { error } = await apiCall(`/api/results/${disputeResultId}/dispute`, {
      method: 'POST', body: JSON.stringify({ reason: disputeReason.trim() }),
    });
    setIsDisputing(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Dispute raised');
    setDisputeResultId(null);
    refetchAll();
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} tintColor="#2D6A4F" />
        }
        contentContainerClassName="pb-8"
      >
        {/* Back */}
        <TouchableOpacity
          className="flex-row items-center gap-1 px-4 pt-3 pb-1"
          onPress={() => router.push(MOBILE_ROUTES.COMPETITION_EVENTS(id))}
        >
          <ChevronLeft size={16} color="#6B7280" />
          <Text className="text-sm text-neutral-500">Events</Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="bg-white border-b border-neutral-200 px-4 py-4 mb-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-neutral-900">{eventName}</Text>
              <Text className="text-sm text-neutral-500 mt-0.5 capitalize">
                {category}{category && resultType ? ' · ' : ''}{resultType.replace('_', ' ')}
                {event.weight_multiplier && event.weight_multiplier !== 1
                  ? ` · ${event.weight_multiplier}×`
                  : ''}
                {isTeamEvent ? ' · Team event' : ''}
              </Text>
            </View>
            <StatusBadge status={status as CompetitionEventStatus} />
          </View>

          <View className="flex-row flex-wrap gap-2 mt-3">
          {canStart && (
            <TouchableOpacity
              className="flex-row items-center gap-2 bg-primary rounded-lg px-4 py-2.5 self-start"
              onPress={handleStart}
              disabled={isStarting}
            >
              {isStarting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Play size={14} color="#fff" />
                  <Text className="text-white font-semibold text-sm">Start Event</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canRecord && !showRecorder && (
            <TouchableOpacity
              className="flex-row items-center gap-2 border border-primary rounded-lg px-4 py-2.5"
              onPress={() => setShowRecorder(true)}
            >
              <ClipboardList size={14} color="#2D6A4F" />
              <Text className="text-primary font-semibold text-sm">Record results</Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity
              className="flex-row items-center gap-2 border border-neutral-200 rounded-lg px-4 py-2.5"
              onPress={confirmCancel}
            >
              <XCircle size={14} color="#6B7280" />
              <Text className="text-neutral-600 font-semibold text-sm">Cancel event</Text>
            </TouchableOpacity>
          )}
          </View>
        </View>

        {/* Status banner */}
        {isActive && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-sm font-medium text-green-800">
              Live: results are being collected
            </Text>
          </View>
        )}
        {isResultsPending && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle size={14} color="#CA8A04" />
            <Text className="text-sm font-medium text-yellow-800">
              Results submitted: awaiting host confirmation
            </Text>
          </View>
        )}
        {isConfirmed && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle size={14} color="#16A34A" />
            <Text className="text-sm font-medium text-green-800">Results confirmed</Text>
          </View>
        )}
        {isCancelled && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-3">
            <XCircle size={14} color="#6B7280" />
            <Text className="text-sm font-medium text-neutral-700">This event was cancelled and does not count towards scores</Text>
          </View>
        )}

        {/* Host dispute review */}
        {openDisputes.length > 0 && (
          <View className="mb-3">
            <HostDisputePanel
              competitionId={id}
              resultType={resultType}
              disputes={openDisputes}
              onChanged={refetchAll}
            />
          </View>
        )}

        {/* Host recorder */}
        {showRecorder && canRecord && (
          <View className="mb-3">
            <HostRecorderPanel
              competitionId={id}
              competitionEventId={eventId}
              resultType={resultType}
              participants={recorderParticipants}
              existing={recorderExisting}
              defaultIncluded={recorderDefaults}
              onClose={() => setShowRecorder(false)}
              onRecorded={() => { setShowRecorder(false); refetchAll(); }}
            />
          </View>
        )}

        {/* Team ratings, balancing and team results */}
        {showTeamPanel && teamState && (
          <View className="mb-3">
            <TeamEventPanel
              competitionId={id}
              competitionEventId={eventId}
              state={teamState}
              viewerId={profile?.id ?? null}
              isHost={isHost}
              isCompetitor={memberRole === 'competitor' && currentMember?.status === 'active'}
              eventStatus={status}
              resultType={resultType}
              onChanged={refetchAll}
            />
          </View>
        )}

        {/* Submit result */}
        {showSubmit && !showSubmitForm && (
          <TouchableOpacity
            className="mx-4 mb-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-4 items-center"
            onPress={() => setShowSubmitForm(true)}
          >
            <Text className="text-primary font-semibold text-sm">+ Submit your result</Text>
          </TouchableOpacity>
        )}
        {showSubmitForm && (
          <View className="mb-3">
            <ResultSubmissionForm
              competitionEventId={eventId}
              competitionId={id}
              resultType={resultType}
              onClose={() => setShowSubmitForm(false)}
              onSubmitted={() => { setShowSubmitForm(false); refetchAll(); }}
            />
          </View>
        )}

        {/* Confirm panel */}
        {canConfirm && !showConfirmPanel && (
          <TouchableOpacity
            className="mx-4 mb-3 rounded-lg border border-yellow-300 bg-yellow-50 py-3 items-center"
            onPress={() => setShowConfirmPanel(true)}
          >
            <Text className="text-sm font-semibold text-yellow-800">
              Review & Confirm Results ({pendingResults.length} pending)
            </Text>
          </TouchableOpacity>
        )}
        {showConfirmPanel && (
          <View className="mb-3">
            <ConfirmResultsPanel
              competitionEventId={eventId}
              competitionId={id}
              results={results}
              resultType={resultType as ResultType}
              onClose={() => setShowConfirmPanel(false)}
              onConfirmed={() => { setShowConfirmPanel(false); refetchAll(); }}
            />
          </View>
        )}

        {/* Results table */}
        <View className="bg-white rounded-lg border border-neutral-200 mx-4 mb-3 overflow-hidden">
          <View className="border-b border-neutral-100 px-4 py-3">
            <Text className="text-sm font-semibold text-neutral-700">
              Results{results.filter((r) => r.confirmed_at).length > 0
                ? ` (${results.filter((r) => r.confirmed_at).length} confirmed)`
                : ''}
            </Text>
          </View>
          {results.length === 0 ? (
            <Text className="px-4 py-8 text-center text-sm text-neutral-500">No results yet</Text>
          ) : (
            results.map((result) => {
              const displayName = result.profiles?.display_name ?? 'Unknown';
              const avatarUrl = result.profiles?.avatar_url ?? null;
              const place = result.finishing_place;
              const rawValue = result.result_value_primary;
              const points = result.points_awarded;
              const confirmed = !!result.confirmed_at;
              const isCurrentUser =
                result.profiles?.id === profile?.id || result.profile_id === profile?.id;
              const isDisputed = (result.result_disputes ?? []).some((d) => d.status === 'open');
              const canDisputeThis =
                !isHost && isCurrentUser && canDispute && confirmed && !isDisputed;

              return (
                <View
                  key={result.id}
                  className={`flex-row items-center gap-3 px-4 py-3 border-b border-neutral-100 ${
                    isCurrentUser ? 'bg-primary-muted/30' : ''
                  }`}
                >
                  <View className="w-8 items-center">
                    {place != null ? (
                      <Text className="text-sm font-bold text-neutral-700">
                        {getPlaceSuffix(place)}
                      </Text>
                    ) : (
                      <Text className="text-xs text-neutral-400">-</Text>
                    )}
                  </View>

                  <View className="w-7 h-7 rounded-full bg-neutral-200 overflow-hidden">
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: 28, height: 28 }} />
                    ) : (
                      <View className="w-7 h-7 rounded-full bg-primary-muted items-center justify-center">
                        <Text className="text-xs font-bold text-primary">
                          {(displayName[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
                      {displayName}
                      {isCurrentUser ? (
                        <Text className="text-xs text-neutral-400"> (you)</Text>
                      ) : null}
                    </Text>
                    {result.is_dnf ? (
                      <Text className="text-xs font-semibold text-error">DNF</Text>
                    ) : rawValue != null ? (
                      <Text className="text-xs text-neutral-500">{formatResultValue(rawValue, resultType)}</Text>
                    ) : null}
                  </View>

                  <View className="items-end">
                    {confirmed ? (
                      <>
                        {points != null && (
                          <Text className="text-sm font-semibold text-neutral-900">
                            {formatPoints(points)}
                          </Text>
                        )}
                        <Text className="text-xs text-green-600">Confirmed</Text>
                      </>
                    ) : (
                      <Text className="text-xs text-neutral-400">Pending</Text>
                    )}
                  </View>

                  {canDisputeThis && (
                    <TouchableOpacity
                      className="ml-1 border border-orange-300 rounded px-2 py-1"
                      onPress={() => handleDispute(result.id)}
                    >
                      <Text className="text-xs font-medium text-orange-600">Dispute</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Awards */}
        {isConfirmed && (
          <View className="mb-3">
            <EventAwardsPanel
              competitionId={id}
              competitionEventId={eventId}
              mvpEnabled={competition?.mvp_voting_enabled ?? false}
              worstEnabled={competition?.worst_performer_enabled ?? false}
              canFinalise={isHost && !competitionFinished}
              onFinalised={refetchAll}
            />
          </View>
        )}

        {/* Performance voting */}
        {showPerformanceVoting && profile?.id && (
          <View className="mb-3">
            <PerformanceVotePanel
              competitionId={id}
              competitionEventId={eventId}
              competitors={competitors}
              mvpEnabled={competition?.mvp_voting_enabled ?? false}
              worstPerformerEnabled={competition?.worst_performer_enabled ?? false}
              currentUserId={profile.id}
              existingMvpVote={null}
              existingWorstVote={null}
              onVoted={refetchAll}
            />
          </View>
        )}
      </ScrollView>
      <Modal visible={disputeResultId !== null} transparent animationType="fade" onRequestClose={() => setDisputeResultId(null)}>
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="rounded-xl bg-white p-5 gap-4">
            <Text className="text-lg font-semibold">Raise dispute</Text>
            <TextInput accessibilityLabel="Dispute reason" placeholder="Describe the reason for your dispute" multiline
              value={disputeReason} onChangeText={setDisputeReason} maxLength={500}
              className="min-h-24 rounded-lg border border-neutral-300 p-3" />
            <TouchableOpacity accessibilityRole="button" disabled={isDisputing || !disputeReason.trim()} onPress={submitDispute}
              className="rounded-lg bg-primary p-3">
              <Text className="text-center text-white">{isDisputing ? 'Submitting…' : 'Submit dispute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" disabled={isDisputing} onPress={() => setDisputeResultId(null)}>
              <Text className="text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
