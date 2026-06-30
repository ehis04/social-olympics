// Journey 6 — Members tab and ghost profile flow
import { test, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Members tab', () => {
  test.use({ storageState: HOST_AUTH_FILE });

  test('members tab renders member list', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/members`);
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible();
  });

  test('host can see the "Add ghost" or invite controls', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/members`);
    // Either a ghost/add button or an invite code should be present for the host
    const hasGhostBtn = await page.getByRole('button', { name: /ghost|add member/i }).isVisible().catch(() => false);
    const hasInviteCode = await page.getByText(/invite code/i).isVisible().catch(() => false);
    expect(hasGhostBtn || hasInviteCode).toBe(true);
  });
});

test.describe('Claim page', () => {
  test.use({ storageState: AUTH_FILE });

  test('/claim/[id] redirects to dashboard for a non-ghost profile id', async ({ page }) => {
    // A non-existent or non-ghost profile should redirect to /dashboard
    await page.goto('/claim/00000000-0000-0000-0000-000000000000');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('claim page shows ghost display name when ghost exists', async ({ page, request }) => {
    // Try to reach a valid ghost claim page if E2E_GHOST_PROFILE_ID env is set
    const ghostId = process.env.E2E_GHOST_PROFILE_ID;
    if (!ghostId) return test.skip();
    await page.goto(`/claim/${ghostId}`);
    await expect(page.getByText(/claim this profile/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /claim/i })).toBeVisible();
  });
});

test.describe('Ghost profile access control', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('unauthenticated user cannot access /claim/* routes', async ({ page }) => {
    await page.goto('/claim/00000000-0000-0000-0000-000000000001');
    await expect(page).toHaveURL(/login|dashboard/);
  });
});
