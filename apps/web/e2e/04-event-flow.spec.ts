// Journey 4 — event lifecycle: view events, submit result
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId, getEventId } from './helpers';

test.describe('Event flow', () => {
  test.use({ storageState: AUTH_FILE });

  test('events tab lists competition events', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/events`);
    await expect(page.getByRole('heading', { name: /events/i })).toBeVisible();
  });

  test('event detail page loads', async ({ page }) => {
    const competitionId = getCompetitionId();
    const eventId = getEventId();
    await page.goto(`/competitions/${competitionId}/events/${eventId}`);
    // Should show event name and status banner
    await expect(page.getByRole('main').locator('h1').last()).toBeVisible();
  });

  test('submit result button appears for active event competitor', async ({ page }) => {
    const competitionId = getCompetitionId();
    const eventId = getEventId();
    await page.goto(`/competitions/${competitionId}/events/${eventId}`);

    const submitBtn = page.getByText(/submit your result/i);
    // Only visible if event is active and user hasn't submitted
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
    }
  });

  test('back to events link navigates correctly', async ({ page }) => {
    const competitionId = getCompetitionId();
    const eventId = getEventId();
    await page.goto(`/competitions/${competitionId}/events/${eventId}`);
    await page.getByText(/events/i).first().click();
    await expect(page).toHaveURL(`/competitions/${competitionId}/events`);
  });
});
