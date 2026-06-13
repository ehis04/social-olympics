const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  DISCOVER: '/competitions/discover',
  CREATE_COMPETITION: '/competitions/create',
  COMPETITION: (id: string) => `/competitions/${id}`,
  COMPETITION_FEED: (id: string) => `/competitions/${id}/feed`,
  COMPETITION_LEADERBOARD: (id: string) => `/competitions/${id}/leaderboard`,
  COMPETITION_EVENTS: (id: string) => `/competitions/${id}/events`,
  COMPETITION_CHAT: (id: string) => `/competitions/${id}/chat`,
  COMPETITION_MEMBERS: (id: string) => `/competitions/${id}/members`,
  COMPETITION_SETTINGS: (id: string) => `/competitions/${id}/settings`,
  EVENT_DETAIL: (compId: string, eventId: string) =>
    `/competitions/${compId}/events/${eventId}`,
  PROFILE: (id: string) => `/profile/${id}`,
  PROFILE_SETTINGS: '/profile/settings',
  MESSAGES: '/messages',
  MESSAGE_THREAD: (id: string) => `/messages/${id}`,
  NOTIFICATIONS: '/notifications',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  ABOUT: '/about',
  TERMS: '/terms',
} as const;

export default ROUTES;
