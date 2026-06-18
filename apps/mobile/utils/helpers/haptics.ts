// Haptic feedback helpers — use on key interactions, not navigation.
import * as Haptics from 'expo-haptics';

export const triggerSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

export const triggerError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

export const triggerLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

export const triggerMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

export const triggerHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
