import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMiddlewareClient } from './middleware';

const { createServerClient } = vi.hoisted(() => ({ createServerClient: vi.fn() }));
vi.mock('@supabase/ssr', async (importOriginal) => ({
  ...await importOriginal<typeof import('@supabase/ssr')>(),
  createServerClient,
}));

describe('middleware session cookies', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key');
    createServerClient.mockClear();
  });

  it('forwards refreshed chunks to rendering and the browser', () => {
    const request = new Request('http://localhost', { headers: { cookie: 'theme=dark; session.0=old; session.1=obsolete' } });
    const response = new Response();
    createMiddlewareClient(request, response);
    const { cookies } = createServerClient.mock.calls[0]![2];
    cookies.setAll([
      { name: 'session.0', value: 'new=value', options: { path: '/', maxAge: 3600 } },
      { name: 'session.1', value: '', options: { path: '/', maxAge: 0 } },
    ], { 'Cache-Control': 'private, no-store' });
    expect(cookies.getAll()).toEqual([
      { name: 'theme', value: 'dark' },
      { name: 'session.0', value: 'new=value' },
    ]);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('removes an invalid session before downstream auth reads it', () => {
    const request = new Request('http://localhost', { headers: { cookie: 'session=expired; theme=dark' } });
    const response = new Response();
    createMiddlewareClient(request, response);
    const { cookies } = createServerClient.mock.calls[0]![2];
    cookies.setAll([{ name: 'session', value: '', options: { path: '/', maxAge: 0 } }], {});
    expect(request.headers.get('cookie')).toBe('theme=dark');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });
});
