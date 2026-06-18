// Journey 3 — user joins a competition via invite code
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { waitForToast } from './helpers';

test.describe('Join competition', () => {
  test.use({ storageState: AUTH_FILE });

  test('join page renders with code pre-filled from URL', async ({ page }) => {
    await page.goto('/join?code=TESTCODE');
    await expect(page.getByPlaceholder(/abcd1234/i)).toHaveValue('TESTCODE');
  });

  test('shows error for invalid invite code', async ({ page }) => {
    await page.goto('/join');
    const input = page.getByPlaceholder(/abcd1234/i);
    await input.fill('INVALID99');
    await page.getByRole('button', { name: /join/i }).click();
    await expect(
      page.getByText(/invalid|not found|expired/i),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('discover page lists public competitions', async ({ page }) => {
    await page.goto('/competitions/discover');
    await expect(page.getByRole('heading', { name: /discover/i })).toBeVisible();
  });

  test('discover search filters competitions', async ({ page }) => {
    await page.goto('/competitions/discover');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('zzz_no_match_xyz');
    // URL should update with query param
    await expect(page).toHaveURL(/q=zzz_no_match_xyz/);
  });
});
