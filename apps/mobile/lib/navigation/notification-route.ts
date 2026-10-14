/*
 * This file works out which screen a notification should open.
 */

import { MOBILE_ROUTES } from '../../constants/routes';

const COMPETITION_TABS = ['feed', 'leaderboard', 'events', 'chat', 'members', 'settings', 'podium'];

function getString(data: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

// Converts a web path from a notification (for example /competitions/abc/events) into the
// matching app screen. Returns null when the app has no equivalent screen.
export function toMobileRoute(path: string): string | null {
  const [pathname] = path.split('?');
  const parts = (pathname ?? '').split('/').filter(Boolean);
  const [section, id, tab, subId] = parts;

  switch (section) {
    case 'dashboard':
      return MOBILE_ROUTES.DASHBOARD;
    case 'notifications':
      return MOBILE_ROUTES.NOTIFICATIONS;
    case 'messages':
      return id ? MOBILE_ROUTES.MESSAGE_THREAD(id) : MOBILE_ROUTES.MESSAGES;
    case 'profile':
      return id && id !== 'settings' && id !== 'search' ? MOBILE_ROUTES.PROFILE(id) : MOBILE_ROUTES.PROFILE_TAB;
    case 'claim':
      return id ? MOBILE_ROUTES.CLAIM(id) : null;
    case 'competitions': {
      if (!id || id === 'discover') return MOBILE_ROUTES.DISCOVER;
      if (tab === 'events' && subId) return MOBILE_ROUTES.EVENT_DETAIL(id, subId);
      if (tab && COMPETITION_TABS.includes(tab)) return `/(app)/competitions/${id}/${tab}`;
      return MOBILE_ROUTES.COMPETITION_FEED(id);
    }
    default:
      return null;
  }
}

// Picks the screen for a notification from its data, matching the web notifications page.
export function getNotificationRoute(data: Record<string, unknown> | null | undefined): string | null {
  const href = getString(data, 'href');
  if (href?.startsWith('/')) return toMobileRoute(href);

  const senderId = getString(data, 'sender_profile_id');
  if (senderId) return MOBILE_ROUTES.MESSAGE_THREAD(senderId);

  const followerId = getString(data, 'follower_profile_id');
  if (followerId) return MOBILE_ROUTES.PROFILE(followerId);

  const competitionId = getString(data, 'competition_id');
  const eventId = getString(data, 'competition_event_id');
  if (competitionId && eventId) return MOBILE_ROUTES.EVENT_DETAIL(competitionId, eventId);
  if (competitionId) return MOBILE_ROUTES.COMPETITION_FEED(competitionId);

  return null;
}
