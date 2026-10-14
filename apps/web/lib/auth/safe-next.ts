/*
 * This file validates "return to" paths used after signing in.
 */

// Accepts only same-site relative paths so a crafted link cannot redirect to another site.
export function getSafeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/api/')) return fallback;
  return value;
}

// Adds a next parameter to an auth page link when there is somewhere to return to.
export function withNext(path: '/login' | '/register', next: string | null | undefined): string {
  const safe = getSafeNextPath(next, '');
  return safe ? `${path}?next=${encodeURIComponent(safe)}` : path;
}
