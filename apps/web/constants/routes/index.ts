import type { Route } from 'next';

const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  DISCOVER: '/competitions/discover',
  CREATE_COMPETITION: '/competitions/create',
  COMPETITION: (id: string) => `/competitions/${id}` as Route,
  COMPETITION_FEED: (id: string) => `/competitions/${id}/feed` as Route,
  COMPETITION_LEADERBOARD: (id: string) => `/competitions/${id}/leaderboard` as Route,
  COMPETITION_EVENTS: (id: string) => `/competitions/${id}/events` as Route,
  COMPETITION_CHAT: (id: string) => `/competitions/${id}/chat` as Route,
  COMPETITION_MEMBERS: (id: string) => `/competitions/${id}/members` as Route,
  COMPETITION_PODIUM: (id: string) => `/competitions/${id}/podium` as Route,
  COMPETITION_SETTINGS: (id: string) => `/competitions/${id}/settings` as Route,
  EVENT_DETAIL: (compId: string, eventId: string) =>
    `/competitions/${compId}/events/${eventId}` as Route,
  PROFILE: (id: string) => `/profile/${id}` as Route,
  PROFILE_SETTINGS: '/profile/settings',
  MESSAGES: '/messages',
  MESSAGE_THREAD: (id: string) => `/messages/${id}` as Route,
  NOTIFICATIONS: '/notifications',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  ABOUT: '/about',
  TERMS: '/terms',
} as const;

export default ROUTES;
