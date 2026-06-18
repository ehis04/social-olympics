// HTTP client for calling the web app Route Handlers with Bearer auth.
import { supabase } from '../supabase/client';

export async function apiCall<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return {
      data: null,
      error: body.error ?? { code: String(response.status), message: response.statusText },
    };
  }

  const body = (await response.json()) as { data: T | null; error: { code: string; message: string } | null };
  return body;
}
