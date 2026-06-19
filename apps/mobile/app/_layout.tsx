import { Stack } from 'expo-router';
import { Providers } from './providers';
import '../global.css';

export default function RootLayout() {
  return (
    <Providers>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </Providers>
  );
}
