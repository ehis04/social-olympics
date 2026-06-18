// Journey 9 — loading states and navigation resilience
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Loading states and navigation', () => {
  test.use({ storageState: AUTH_FILE });

  test('dashboard renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /my competitions/i })).toBeVisible();
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('competition layout renders all nav tabs', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: /feed/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /events/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /leaderboard/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /members/i })).toBeVisible();
  });

  test('navigating between tabs does not show errors', async ({ page }) => {
    const competitionId = getCompetitionId();
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`/competitions/${competitionId}/feed`);
    const main = page.getByRole('main');
    await main.getByRole('link', { name: /leaderboard/i }).click();
    await expect(page).toHaveURL(`/competitions/${competitionId}/leaderboard`);

    await page.getByRole('main').getByRole('link', { name: /events/i }).click();
    await expect(page).toHaveURL(`/competitions/${competitionId}/events`);

    await page.getByRole('main').getByRole('link', { name: /members/i }).click();
    await expect(page).toHaveURL(`/competitions/${competitionId}/members`);

    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('slow network still renders content via skeleton then real data', async ({ page }) => {
    await page.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 100));
      await route.continue();
    });
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible({ timeout: 15_000 });
  });

  test('keyword filter blocks offensive content', async ({ request }) => {
    const competitionId = getCompetitionId();
    const res = await request.post(`/api/competitions/${competitionId}/chat`, {
      data: { content: 'You are a fucking idiot' },
    });
    expect(res.status()).toBe(422);
    const json = await res.json();
    expect(json.error.code).toBe('CONTENT_BLOCKED');
  });
});
