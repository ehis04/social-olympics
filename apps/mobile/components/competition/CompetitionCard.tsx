// Mobile competition card — matches web CompetitionCard data fields.
import { TouchableOpacity, View, Text } from 'react-native';
import { Users, Calendar, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOBILE_ROUTES } from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
  memberCount?: number;
  showJoinButton?: boolean;
  onJoin?: (id: string) => void;
}

export function CompetitionCard({ competition, memberCount, showJoinButton, onJoin }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="rounded-lg border border-neutral-200 bg-white shadow-sm mb-3"
      onPress={() => router.push(MOBILE_ROUTES.COMPETITION_FEED(competition.id))}
      activeOpacity={0.7}
    >
      <View className="p-4">
        <View className="flex-row items-start justify-between gap-2 mb-2">
          <Text className="text-base font-bold text-neutral-800 flex-1 leading-tight" numberOfLines={2}>
            {competition.name}
          </Text>
          <StatusBadge status={competition.status} />
        </View>

        {competition.description ? (
          <Text className="text-sm text-neutral-600 mb-3" numberOfLines={2}>
            {competition.description}
          </Text>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          {memberCount != null && (
            <View className="flex-row items-center gap-1">
              <Users size={13} color="#6B7280" />
              <Text className="text-xs text-neutral-500">
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            </View>
          )}
          {competition.total_events != null && (
            <View className="flex-row items-center gap-1">
              <Calendar size={13} color="#6B7280" />
              <Text className="text-xs text-neutral-500">
                {competition.total_events} {competition.total_events === 1 ? 'event' : 'events'}
              </Text>
            </View>
          )}
          {(competition.city ?? competition.country_code) ? (
            <View className="flex-row items-center gap-1">
              <MapPin size={13} color="#6B7280" />
              <Text className="text-xs text-neutral-500">
                {[competition.city, competition.country_code].filter(Boolean).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {showJoinButton && onJoin ? (
        <View className="border-t border-neutral-100 px-4 py-3">
          <TouchableOpacity
            className="bg-primary rounded-lg py-2 items-center"
            onPress={() => onJoin(competition.id)}
          >
            <Text className="text-white text-sm font-semibold">Join</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}
