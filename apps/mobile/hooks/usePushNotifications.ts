/*
 * This file provides the usePushNotifications React hook.
 */

// Push notification setup — registers the device, shows foreground alerts and opens tapped notifications.
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { registerPushToken, unregisterPushToken } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { getNotificationRoute } from '@/lib/navigation/notification-route';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// The token registered for the signed-in person, so it can be removed when they sign out.
let registeredToken: { profileId: string; token: string } | null = null;

// Stops push notifications to this device for the signed-in person. Call before signing out.
export async function unregisterDevicePushToken(): Promise<void> {
  if (!registeredToken) return;
  const { profileId, token } = registeredToken;
  registeredToken = null;
  await unregisterPushToken(supabase, profileId, token).catch(() => null);
}

// Provides the use push notifications hook.
export function usePushNotifications() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const router = useRouter();
  const handledResponseId = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void registerForPushNotificationsAsync().then(async (token) => {
      if (!token || cancelled) return;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const { error } = await registerPushToken(supabase, userId, token, platform);
      if (!error) registeredToken = { profileId: userId, token };
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Opens the notification's screen, including the one that launched the app from closed.
  useEffect(() => {
    if (!userId || !lastResponse) return;
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;

    const data = lastResponse.notification.request.content.data as Record<string, unknown> | undefined;
    const route = getNotificationRoute(data);
    if (route) router.push(route as never);
  }, [userId, lastResponse, router]);
}

// Handles register for push notifications async.
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice || Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Competition updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId =
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}
