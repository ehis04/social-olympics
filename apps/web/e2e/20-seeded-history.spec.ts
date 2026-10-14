import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';

const manifestPath = resolve(process.cwd(), '../../LOCAL_DEMO_DATA.json');
const demo = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  retainedProfileId: string;
  people: { id: string }[];
  competitions: { id: string; name: string; status: string; events: { id: string }[] }[];
} : null;

test.describe('populated competition experience', () => {
  test.skip(!demo, 'Run the local history seed before these data-backed checks.');
  test.use({ storageState: AUTH_FILE });

  test('profile links active competitions and completed podiums with real statistics', async ({ page }) => {
    await page.goto(`/profile/${demo!.retainedProfileId}`);
    await expect(page.getByRole('heading', { name: 'Competition history' })).toBeVisible();
    const history = page.getByRole('region', { name: 'Competition history' });
    for (const competition of demo!.competitions) {
      const link = history.getByRole('link', { name: new RegExp(`^${competition.name}`) });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', `/competitions/${competition.id}/${competition.status === 'active' ? 'events' : 'podium'}`);
    }
    await expect(page.getByText(/Final place #/).first()).toBeVisible();
    await expect(page.getByText(/NaN/)).toHaveCount(0);
    await history.getByRole('link', { name: /^Dublin Summer Games/ }).click();
    await expect(page.getByRole('heading', { name: /Competition Complete/ })).toBeVisible();
  });

  test('unfinished events prevent premature completion', async ({ request }) => {
    const competition = demo!.competitions[3]!;
    const response = await request.post(`/api/competitions/${competition.id}/complete`);
    expect(response.status()).toBe(409);
    expect((await response.json()).error).toMatch(/Confirm all event results/);
  });

  test('completed scores cannot be submitted, recorded or reconfirmed', async ({ request }) => {
    const competition = demo!.competitions[0]!;
    for (const path of ['results', `events/${competition.events[0]!.id}/record`, `events/${competition.events[0]!.id}/confirm`]) {
      const response = await request.post(`/api/competitions/${competition.id}/${path}`, { data: {} });
      expect(response.status()).toBe(409);
      expect((await response.json()).error).toMatch(/finished/);
    }
  });

  test('conversations and result notifications are populated', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByText('Aoife Murphy').first()).toBeVisible();
    await page.goto('/notifications');
    await expect(page.getByText('Your final results are ready').first()).toBeVisible();
  });

  test('event-selection locking permits open MVP voting but finalised awards stay closed', async ({ request }) => {
    const competition = demo!.competitions[3]!;
    const data = { voted_for_profile_id: demo!.people[1]!.id, vote_type: 'mvp' };
    const openVote = await request.post(`/api/competitions/${competition.id}/events/${competition.events[3]!.id}/vote`, { data });
    expect(openVote.status()).toBe(200);
    const closedVote = await request.post(`/api/competitions/${competition.id}/events/${competition.events[0]!.id}/vote`, { data });
    expect(closedVote.status()).toBe(409);
    expect((await closedVote.json()).error.code).toBe('VOTING_CLOSED');
  });
});
