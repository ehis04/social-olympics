/*
 * This file verifies how the mobile app opens notifications.
 */

import { describe, expect, it } from 'vitest';
import { getNotificationRoute, toMobileRoute } from '../../../mobile/lib/navigation/notification-route';

describe('toMobileRoute', () => {
  it.each([
    ['/competitions/abc/events', '/(app)/competitions/abc/events'],
    ['/competitions/abc/events/ev1', '/(app)/competitions/abc/events/ev1'],
    ['/competitions/abc/podium', '/(app)/competitions/abc/podium'],
    ['/competitions/abc', '/(app)/competitions/abc/feed'],
    ['/competitions/abc/unknown-tab', '/(app)/competitions/abc/feed'],
    ['/messages/p1', '/(app)/messages/p1'],
    ['/messages', '/(app)/messages'],
    ['/profile/p2', '/(app)/profile/p2'],
    ['/profile/settings', '/(app)/(tabs)/profile'],
    ['/claim/g1', '/(app)/claim/g1'],
    ['/dashboard', '/(app)/(tabs)/dashboard'],
    ['/notifications?x=1', '/(app)/(tabs)/notifications'],
  ])('maps %s to %s', (path, route) => {
    expect(toMobileRoute(path)).toBe(route);
  });

  it('returns null for pages the app does not have', () => {
    expect(toMobileRoute('/admin/reports')).toBeNull();
  });
});

describe('getNotificationRoute', () => {
  it('prefers the href in the notification data', () => {
    expect(getNotificationRoute({ href: '/competitions/c1/leaderboard', competition_id: 'c1' }))
      .toBe('/(app)/competitions/c1/leaderboard');
  });

  it('falls back to the sender, follower, event and competition ids', () => {
    expect(getNotificationRoute({ sender_profile_id: 's1' })).toBe('/(app)/messages/s1');
    expect(getNotificationRoute({ follower_profile_id: 'f1' })).toBe('/(app)/profile/f1');
    expect(getNotificationRoute({ competition_id: 'c1', competition_event_id: 'e1' }))
      .toBe('/(app)/competitions/c1/events/e1');
    expect(getNotificationRoute({ competition_id: 'c1' })).toBe('/(app)/competitions/c1/feed');
  });

  it('returns null when there is nowhere to go', () => {
    expect(getNotificationRoute({})).toBeNull();
    expect(getNotificationRoute(null)).toBeNull();
  });
});
