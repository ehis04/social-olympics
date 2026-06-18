// TeamAssignmentPanel — host selects team count and triggers balanced team assignment.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Users, Shuffle, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';

interface RatedPlayer {
  profileId: string;
  displayName: string;
  strengthRating: number;
}

interface AssignedTeam {
  teamId: string;
  members: RatedPlayer[];
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  ratedPlayers: RatedPlayer[];
  existingTeams: AssignedTeam[] | null;
  onAssigned: () => void;
}

export function TeamAssignmentPanel({
  competitionId,
  competitionEventId,
  ratedPlayers,
  existingTeams,
  onAssigned,
}: Props) {
  const [teamCount, setTeamCount] = useState(2);
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<{ teams: AssignedTeam[]; withinTolerance: boolean } | null>(
    existingTeams ? { teams: existingTeams, withinTolerance: true } : null
  );

  const minTeams = 2;
  const maxTeams = Math.max(2, Math.floor(ratedPlayers.length / 2));
  const playersPerTeam = Math.ceil(ratedPlayers.length / teamCount);

  if (ratedPlayers.length < 2) {
    return (
      <View className="flex-row items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 mx-4">
        <AlertTriangle size={15} color="#CA8A04" style={{ marginTop: 2 }} />
        <Text className="text-sm text-yellow-800 flex-1">
          At least 2 players with confirmed strength ratings are needed to assign teams.
        </Text>
      </View>
    );
  }

  async function handleAssign() {
    setIsAssigning(true);
    const { data, error } = await apiCall(
      `/api/competitions/${competitionId}/events/${competitionEventId}/teams`,
      {
        method: 'POST',
        body: JSON.stringify({ team_count: teamCount }),
      }
    );
    setIsAssigning(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    setResult(data as { teams: AssignedTeam[]; withinTolerance: boolean });
    toast.success('Teams assigned');
    onAssigned();
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4 gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2D6A4F" />
          <Text className="text-sm font-semibold text-neutral-700">Team Assignment</Text>
        </View>
        <Text className="text-xs text-neutral-500">{ratedPlayers.length} rated players</Text>
      </View>

      {!result && (
        <View className="gap-4">
          <View>
            <Text className="text-xs font-semibold text-neutral-700 mb-3">Number of teams</Text>
            <View className="flex-row items-center justify-center gap-6">
              <TouchableOpacity
                className="w-10 h-10 rounded-full border border-neutral-200 items-center justify-center bg-neutral-50"
                onPress={() => setTeamCount((c) => Math.max(minTeams, c - 1))}
                disabled={teamCount <= minTeams}
              >
                <Text className="text-xl font-semibold text-neutral-700">−</Text>
              </TouchableOpacity>
              <View className="items-center">
                <Text className="text-3xl font-bold text-primary">{teamCount}</Text>
                <Text className="text-xs text-neutral-400">~{playersPerTeam} per team</Text>
              </View>
              <TouchableOpacity
                className="w-10 h-10 rounded-full border border-neutral-200 items-center justify-center bg-neutral-50"
                onPress={() => setTeamCount((c) => Math.min(maxTeams, c + 1))}
                disabled={teamCount >= maxTeams}
              >
                <Text className="text-xl font-semibold text-neutral-700">+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 bg-primary rounded-lg py-3"
            onPress={handleAssign}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Shuffle size={15} color="#fff" />
                <Text className="text-white font-semibold text-sm">Assign Balanced Teams</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View className="gap-3">
          {result.withinTolerance ? (
            <View className="flex-row items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <CheckCircle size={13} color="#16A34A" />
              <Text className="text-xs font-medium text-green-800">Teams balanced within tolerance</Text>
            </View>
          ) : (
            <View className="flex-row items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5">
              <AlertTriangle size={13} color="#CA8A04" style={{ marginTop: 1 }} />
              <Text className="text-xs text-yellow-700 flex-1">
                Could not perfectly balance — this is the best possible assignment.
              </Text>
            </View>
          )}

          <View className="gap-2">
            {result.teams.map((team, i) => {
              const avgStrength =
                team.members.length > 0
                  ? team.members.reduce((sum, m) => sum + m.strengthRating, 0) / team.members.length
                  : 0;
              return (
                <View key={team.teamId} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <Text className="text-xs font-bold text-neutral-700 mb-2">
                    Team {String.fromCharCode(65 + i)}{' '}
                    <Text className="font-normal text-neutral-400">avg {avgStrength.toFixed(1)}</Text>
                  </Text>
                  {team.members.map((m) => (
                    <View key={m.profileId} className="flex-row items-center justify-between py-0.5">
                      <Text className="text-xs text-neutral-700 flex-1" numberOfLines={1}>
                        {m.displayName}
                      </Text>
                      <Text className="text-xs font-semibold text-neutral-500 ml-2">
                        {m.strengthRating}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 border border-neutral-200 rounded-lg py-2.5"
            onPress={() => setResult(null)}
          >
            <Shuffle size={13} color="#6B7280" />
            <Text className="text-sm font-medium text-neutral-600">Re-assign teams</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
