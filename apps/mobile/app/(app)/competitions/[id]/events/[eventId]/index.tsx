// Event detail screen — results, host confirmation, voting, team/strength panels.
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, CheckCircle, AlertTriangle, ChevronLeft } from 'lucide-react-native';
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
import { StrengthVoteWidget } from '@/components/events/StrengthVoteWidget';
import { TeamAssignmentPanel } from '@/components/events/TeamAssignmentPanel';
import { PerformanceVotePanel } from '@/components/events/PerformanceVotePanel';
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
  points_awarded: number | null;
  finishing_place: number | null;
  confirmed_at: string | null;
  disputed_at: string | null;
  submitted_at: string | null;
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
    event_categories: { name: string | null } | null;
  } | null;
}

function getPlaceSuffix(place: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${place}${suffixes[place] ?? 'th'}`;
}

function canSubmitResult(role: MemberRole, status: string): boolean {
  return (role === 'competitor' || role === 'cohost') && status === 'active';
}

export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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

  function refetchAll() {
    refetchEvent();
    refetchResults();
    queryClient.invalidateQueries({ queryKey: ['competition', id, 'events'] });
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
  const isTeamEvent = event.is_team_event ?? false;

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
  const canDispute =
    !isHost &&
    !!currentUserResult?.confirmed_at &&
    isResultsPending &&
    disputeWindowOpen &&
    !currentUserResult?.disputed_at;

  const showPerformanceVoting = isConfirmed && memberRole !== null && !isHost;
  const showStrengthVoting = isTeamEvent && isActive && !isHost && memberRole !== null;
  const showTeamAssignment = isTeamEvent && isHost && isActive;

  const competitors = members
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

  async function handleDispute(resultId: string) {
    Alert.prompt(
      'Raise Dispute',
      'Describe the reason for your dispute:',
      async (reason) => {
        if (!reason?.trim()) return;
        const { error } = await apiCall(`/api/competitions/${id}/results/${resultId}/dispute`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        });
        if (error) { toast.error(error.message); return; }
        toast.success('Dispute raised');
        refetchAll();
      },
      'plain-text'
    );
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

          {canStart && (
            <TouchableOpacity
              className="flex-row items-center gap-2 bg-primary rounded-lg px-4 py-2.5 mt-3 self-start"
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
        </View>

        {/* Status banner */}
        {isActive && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <View className="w-2 h-2 rounded-full bg-green-500" />
            <Text className="text-sm font-medium text-green-800">
              Live — results are being collected
            </Text>
          </View>
        )}
        {isResultsPending && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle size={14} color="#CA8A04" />
            <Text className="text-sm font-medium text-yellow-800">
              Results submitted — awaiting host confirmation
            </Text>
          </View>
        )}
        {isConfirmed && (
          <View className="flex-row items-center gap-2 mx-4 mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <CheckCircle size={14} color="#16A34A" />
            <Text className="text-sm font-medium text-green-800">Results confirmed</Text>
          </View>
        )}

        {/* Strength voting */}
        {showStrengthVoting && profile?.id && (
          <View className="mb-3">
            <StrengthVoteWidget
              competitionId={id}
              competitionEventId={eventId}
              pendingRatings={[]}
              currentUserId={profile.id}
              onVoted={refetchAll}
            />
          </View>
        )}

        {/* Team assignment */}
        {showTeamAssignment && (
          <View className="mb-3">
            <TeamAssignmentPanel
              competitionId={id}
              competitionEventId={eventId}
              ratedPlayers={[]}
              existingTeams={null}
              onAssigned={refetchAll}
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
              const isDisputed = !!result.disputed_at;
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
                      <Text className="text-xs text-neutral-400">—</Text>
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
                    {rawValue != null && (
                      <Text className="text-xs text-neutral-500">
                        {formatResultValue(rawValue, resultType as ResultType)}
                      </Text>
                    )}
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
    </SafeAreaView>
  );
}
