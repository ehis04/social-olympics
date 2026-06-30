// Journey: Access control — non-member, host-only, and responsive smoke
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

const PROTECTED_ROUTES = [
  '/dashboard',
  '/competitions/discover',
  '/notifications',
  '/messages',
  '/profile/settings',
];

test.describe('Unauthenticated access control', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PROTECTED_ROUTES) {
    test(`${route} redirects to /login when unauthenticated`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/login/);
    });
  }

  test('private competition URL is not accessible without auth', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Authenticated user redirected from auth pages', () => {
  test.use({ storageState: AUTH_FILE });

  test('/login redirects to dashboard when already logged in', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('/register redirects to dashboard when already logged in', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe('Marketing pages (public)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('/ root redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
  });

  test('/about loads without auth', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('/terms loads without auth', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('main')).toBeVisible();
  });
});

test.describe('Responsive / UI smoke', () => {
  test.use({ storageState: AUTH_FILE });

  test('dashboard renders at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await expect(page.getByRole('main')).toBeVisible();
    // No text overflow or layout crash
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('dashboard renders at mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('competition feed renders at mobile width', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/competitions/${competitionId}/feed`);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('no unhandled JavaScript errors on dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Filter out known third-party noise
    const realErrors = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Extension'));
    expect(realErrors).toHaveLength(0);
  });
});
