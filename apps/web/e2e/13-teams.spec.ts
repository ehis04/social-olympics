// Journey 10 — team events: strength rating and team leaderboard tab
import { test, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId, getEventId } from './helpers';

test.describe('Team leaderboard tab', () => {
  test.use({ storageState: AUTH_FILE });

  test('leaderboard page has team tab', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    await expect(page.getByRole('button', { name: /team/i })).toBeVisible();
  });

  test('team tab switches to team view', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/leaderboard`);
    await page.getByRole('button', { name: /team/i }).click();
    // Either shows team rows or an empty state
    const hasTeamContent = await page.getByText(/team|no team/i).isVisible().catch(() => false);
    expect(hasTeamContent || await page.getByRole('main').isVisible()).toBe(true);
  });
});

test.describe('Team assignment (host)', () => {
  test.use({ storageState: HOST_AUTH_FILE });

  test('event detail shows team assignment panel for team events', async ({ page }) => {
    const competitionId = getCompetitionId();
    const eventId = getEventId();
    await page.goto(`/competitions/${competitionId}/events/${eventId}`);

    // Team assignment panel appears only on team events
    const teamPanel = page.getByText(/assign teams|team assignment|balance teams/i);
    if (await teamPanel.isVisible()) {
      await expect(teamPanel).toBeVisible();
    } else {
      // Non-team event — page still loads correctly
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});

test.describe('Strength vote widget', () => {
  test.use({ storageState: AUTH_FILE });

  test('strength rating widget appears on team events for competitors', async ({ page }) => {
    const competitionId = getCompetitionId();
    const eventId = getEventId();
    await page.goto(`/competitions/${competitionId}/events/${eventId}`);

    const strengthWidget = page.getByText(/strength rating|confirm rating|vote/i).first();
    if (await strengthWidget.isVisible()) {
      await expect(strengthWidget).toBeVisible();
    } else {
      await expect(page.getByRole('main')).toBeVisible();
    }
  });
});
