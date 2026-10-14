// HTTP client for the web API, shared by mobile screens and mutations.
import { supabase } from '../supabase/client';

type ApiResult<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  // Set by paginated endpoints such as feeds and message lists.
  hasMore?: boolean;
  nextCursor?: string;
};

export async function apiCall<T>(path: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return { data: null, error: { code: 'CONFIGURATION', message: 'The API server URL is not configured.' } };
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) return { data: null, error: { code: 'AUTH', message: sessionError.message } };

    const headers = new Headers(options.headers);
    // Photo uploads send FormData, which sets its own multipart Content-Type.
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, { ...options, headers });
    if (response.status === 204) return { data: null, error: null };

    const body = await response.json().catch(() => null) as {
      data?: T;
      error?: string | { code?: string; message?: string };
      hasMore?: boolean;
      nextCursor?: string;
    } | null;
    if (!response.ok) {
      const error = body?.error;
      return {
        data: null,
        error: {
          code: typeof error === 'object' && error?.code ? error.code : String(response.status),
          message: typeof error === 'string' ? error
            : error?.message ?? (response.statusText || 'The request failed. Please try again.'),
        },
      };
    }
    if (!body) return { data: null, error: { code: 'INVALID_RESPONSE', message: 'The server returned an invalid response.' } };
    return {
      data: body.data ?? null,
      error: null,
      ...(typeof body.hasMore === 'boolean' ? { hasMore: body.hasMore } : {}),
      ...(body.nextCursor ? { nextCursor: body.nextCursor } : {}),
    };
  } catch {
    return { data: null, error: { code: 'NETWORK', message: 'Unable to reach the server. Check your connection and try again.' } };
  }
}
