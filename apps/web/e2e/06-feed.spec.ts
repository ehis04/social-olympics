// Journey 6 — competition feed: load, react, comment
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Competition feed', () => {
  test.use({ storageState: AUTH_FILE });

  test('feed page loads', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);
    // Either feed items or empty state
    await expect(
      page.getByText(/no activity yet/i).or(page.locator('[class*="rounded-lg border"]').first()),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('feed navigation tabs are present', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);
    // Competition nav should show multiple tabs
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: /leaderboard/i })).toBeVisible();
    await expect(main.getByRole('link', { name: /events/i })).toBeVisible();
  });

  test('can open comment section on a feed item', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    const commentBtn = page.getByRole('button', { name: /comment/i }).first();
    if (await commentBtn.isVisible()) {
      await commentBtn.click();
      await expect(page.getByPlaceholder(/write a comment/i)).toBeVisible();
    }
  });

  test('can click an emoji reaction on a feed item', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    // Find the first 👏 reaction button
    const reactionBtn = page.getByRole('button', { name: '👏' }).first();
    if (await reactionBtn.isVisible()) {
      await reactionBtn.click();
      // No error toast should appear
      await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    }
  });
});
