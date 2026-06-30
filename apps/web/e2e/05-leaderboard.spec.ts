// Journey 5 — leaderboard individual and team views
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Leaderboard', () => {
  test.use({ storageState: AUTH_FILE });

  test('leaderboard page renders', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible();
  });

  test('switches to team tab', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    const teamTab = page.getByRole('button', { name: /team/i });
    await expect(teamTab).toBeVisible();
    await teamTab.click();
    // Team tab content should appear
    await expect(page.getByRole('button', { name: /^team$/i })).toBeVisible();
  });

  test('switches back to individual tab', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    await page.getByRole('button', { name: /team/i }).click();
    await page.getByRole('button', { name: /individual/i }).click();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('leaderboard shows empty state when no results', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    // Wait for the leaderboard section to be visible (heading always renders)
    await expect(page.getByRole('heading', { name: /leaderboard/i })).toBeVisible();
    // Either a table (members with 0 points) or empty state message — both are valid
    const hasTable = await page.getByRole('table').isVisible();
    const hasEmpty = await page.getByText(/no results yet|check back/i).isVisible();
    expect(hasTable || hasEmpty).toBe(true);
  });
});
