// Notifications tab — user notifications (implemented in Branch 4).
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center">
        <Text className="text-neutral-400">Notifications — coming in Branch 4</Text>
      </View>
    </SafeAreaView>
  );
}
