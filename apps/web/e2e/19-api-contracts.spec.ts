import { test, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE, getSessionFromAuthState } from './fixtures/auth-state';
import { getCompetitionId, getEventId } from './helpers';

test.describe('API authentication and result boundaries', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated API calls return JSON 401', async ({ request }) => {
    const response = await request.get('/api/profile');
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHORISED');
  });

  test('mobile bearer authentication works without browser cookies', async ({ request }) => {
    const session = getSessionFromAuthState(AUTH_FILE)!;
    const response = await request.get('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
    expect(response.status()).toBe(200);
    expect((await response.json()).data.id).toBe(session.user?.id);
  });

  test('an invalid bearer token cannot access the API', async ({ request }) => {
    const response = await request.get('/api/profile', { headers: { Authorization: 'Bearer invalid-token' } });
    expect(response.status()).toBe(401);
  });

  test('host cannot confirm a result outside the specified event', async ({ request }) => {
    const session = getSessionFromAuthState(HOST_AUTH_FILE)!;
    const response = await request.post(`/api/competitions/${getCompetitionId()}/events/${getEventId()}/confirm`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      data: { rankings: [{ resultId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', place: 1 }] },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBe('Every result must belong to this event');
  });

  test('confirmation rejects duplicate IDs before writing results', async ({ request }) => {
    const session = getSessionFromAuthState(HOST_AUTH_FILE)!;
    const ranking = { resultId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', place: 1 };
    const response = await request.post(`/api/competitions/${getCompetitionId()}/events/${getEventId()}/confirm`, {
      headers: { Authorization: `Bearer ${session.access_token}` }, data: { rankings: [ranking, ranking] },
    });
    expect(response.status()).toBe(400);
  });
});
