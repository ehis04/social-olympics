// Journey 2 — host creates a competition
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { waitForToast } from './helpers';

test.describe('Competition creation', () => {
  test.use({ storageState: AUTH_FILE });

  test('creates a competition and lands on feed', async ({ page }) => {
    await page.goto('/competitions/create');
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible();

    const name = `E2E Test Competition ${Date.now()}`;
    await page.getByPlaceholder(/office olympics/i).fill(name);
    await page.getByPlaceholder(/describe your competition/i).fill('Automated E2E test competition');

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/select the events/i)).toBeVisible();
    await page.locator('input[type="checkbox"]').first().check();

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/enable mvp voting/i)).toBeVisible();

    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/invite link/i)).toBeVisible();

    await page.getByRole('button', { name: /^create competition$/i }).click();

    // Should land on the feed or dashboard with the new competition
    await expect(page).toHaveURL(/\/competitions\/[a-z0-9-]+\/feed|\/dashboard/);
  });

  test('shows validation error for missing name', async ({ page }) => {
    await page.goto('/competitions/create');
    await page.getByRole('button', { name: /^next$/i }).click();
    await expect(page.getByText(/name must be at least 3 characters/i)).toBeVisible();
  });

  test('dashboard shows new competition after creation', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /my competitions/i })).toBeVisible();
    // At least one competition card should be present after prior test
    const cards = page.locator('[href*="/competitions/"]');
    await expect(cards.first()).toBeVisible();
  });
});
