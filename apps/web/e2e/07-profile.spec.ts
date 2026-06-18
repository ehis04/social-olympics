// Journey 7 — user profile page
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';

test.describe('Profile page', () => {
  test.use({ storageState: AUTH_FILE });

  test('own profile page loads via settings link', async ({ page }) => {
    await page.goto('/profile/settings');
    await expect(page).toHaveURL(/\/profile\/settings/);
  });

  test('profile page renders for a known user', async ({ page }) => {
    const profileId = process.env.E2E_PROFILE_ID;
    if (!profileId) {
      test.skip();
      return;
    }
    await page.goto(`/profile/${profileId}`);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('personal bests section renders or shows empty state', async ({ page }) => {
    const profileId = process.env.E2E_PROFILE_ID;
    if (!profileId) {
      test.skip();
      return;
    }
    await page.goto(`/profile/${profileId}`);
    await expect(page.getByRole('heading', { name: /personal bests/i })).toBeVisible({ timeout: 8_000 });
  });

  test('message button is visible on another user profile', async ({ page }) => {
    const profileId = process.env.E2E_OTHER_PROFILE_ID;
    if (!profileId) {
      test.skip();
      return;
    }
    await page.goto(`/profile/${profileId}`);
    await expect(page.getByRole('link', { name: /^message$/i })).toBeVisible();
  });

  test('unknown profile returns not found', async ({ page }) => {
    await page.goto('/profile/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 8_000 });
  });
});
