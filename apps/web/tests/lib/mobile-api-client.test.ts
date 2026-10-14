import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiCall } from '../../../mobile/lib/api/client';

vi.mock('../../../mobile/lib/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } }, error: null })) } },
}));

beforeEach(() => { vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', 'http://localhost:3000/'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('mobile API contract', () => {
  it('sends bearer auth and preserves Headers-based caller options', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { competitionId: 'comp' } })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await apiCall('/api/competitions/join', { headers: new Headers({ 'X-Test': 'yes' }) })).toEqual({ data: { competitionId: 'comp' }, error: null });
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/api/competitions/join');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer test-token');
    expect(new Headers(options.headers).get('X-Test')).toBe('yes');
  });

  it.each(['Invalid invite code', { code: 'FORBIDDEN', message: 'Host only' }])('normalizes API errors: %j', async (error) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error }), { status: 400 })));
    const result = await apiCall('/api/test');
    expect(result.error?.message).toBe(typeof error === 'string' ? error : error.message);
    expect(result.data).toBeNull();
  });

  it('returns a usable error for a disconnected server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect((await apiCall('/api/test')).error?.code).toBe('NETWORK');
  });

  it('rejects successful HTML instead of reporting a successful mutation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Login</html>')));
    expect((await apiCall('/api/test')).error?.code).toBe('INVALID_RESPONSE');
  });
});
