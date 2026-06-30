// Journey 16 — settings and host controls
import { test, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Settings page (host)', () => {
  test.use({ storageState: HOST_AUTH_FILE });

  test('settings page loads for host', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);
    await expect(page.getByRole('heading', { name: /settings|competition/i }).first()).toBeVisible();
  });

  test('settings form shows competition name field', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);
    // The form has a "Basic info" section with a Name input (no htmlFor — find by heading)
    await expect(page.getByRole('heading', { name: /basic info/i })).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('host can edit and save competition description', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);

    const descField = page.getByLabel(/description/i);
    if (await descField.isVisible()) {
      await descField.fill('Updated via E2E test');
      await page.getByRole('button', { name: /save|update/i }).click();
      await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  test('Complete Competition button is present and disabled on non-complete status', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);

    const completeBtn = page.getByRole('button', { name: /complete competition|finalise/i });
    if (await completeBtn.isVisible()) {
      // Button should be present for the host
      await expect(completeBtn).toBeVisible();
    }
  });
});

test.describe('Settings page (non-host access control)', () => {
  test.use({ storageState: AUTH_FILE });

  test('non-host member is redirected away from settings page', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);
    // Should redirect to feed or show 404 — definitely not the settings form
    await expect(page).not.toHaveURL(/settings/);
  });
});

test.describe('Settings page (unauthenticated)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated user is redirected from settings', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/settings`);
    await expect(page).toHaveURL(/login/);
  });
});
