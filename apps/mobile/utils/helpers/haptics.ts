/*
 * This file defines the haptics module.
 */

// Haptic feedback helpers — use on key interactions, not navigation.
import * as Haptics from 'expo-haptics';

// Handles trigger success.
export const triggerSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Handles trigger error.
export const triggerError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Handles trigger light.
export const triggerLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Handles trigger medium.
export const triggerMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Handles trigger heavy.
export const triggerHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
