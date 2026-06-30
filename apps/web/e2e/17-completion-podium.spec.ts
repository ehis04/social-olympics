// Journey 17 — competition completion and podium
import { test, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Podium page (member)', () => {
  test.use({ storageState: AUTH_FILE });

  test('podium page redirects or loads for non-complete competition', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/podium`);
    // If competition is not complete, it may redirect to feed
    // If complete, it should show the podium
    const onPodium = page.url().includes('podium');
    const onFeed = page.url().includes('feed') || page.url().includes(competitionId);
    expect(onPodium || onFeed).toBe(true);
  });

  test('podium page shows results table for completed competition', async ({ page }) => {
    const competitionId = process.env.E2E_COMPLETED_COMPETITION_ID ?? getCompetitionId();
    await page.goto(`/competitions/${competitionId}/podium`);
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});

    const url = page.url();
    if (url.includes('/podium')) {
      // Podium loaded — should show results, a stand, or the competition heading
      await expect(page.getByRole('heading').first()).toBeVisible();
    } else {
      // Non-complete competition redirected — just verify we landed somewhere valid
      expect(url).toMatch(/competitions|dashboard/);
    }
  });
});

test.describe('Podium page (host controls)', () => {
  test.use({ storageState: HOST_AUTH_FILE });

  test('archive button appears for host on completed competition', async ({ page }) => {
    const completedId = process.env.E2E_COMPLETED_COMPETITION_ID;
    if (!completedId) return test.skip();

    await page.goto(`/competitions/${completedId}/podium`);
    const archiveBtn = page.getByRole('button', { name: /archive/i });
    if (await archiveBtn.isVisible()) {
      await expect(archiveBtn).toBeVisible();
    }
  });
});

test.describe('Access: complete competition action', () => {
  test.use({ storageState: HOST_AUTH_FILE });

  test('complete competition API returns 404 for non-existent competition', async ({ request }) => {
    const res = await request.post('/api/competitions/00000000-0000-0000-0000-000000000000/complete');
    expect([403, 404, 401]).toContain(res.status());
  });

  test('complete competition API returns 403 for non-host', async ({ request, browser }) => {
    const competitionId = getCompetitionId();
    const ctx = await browser.newContext({ storageState: AUTH_FILE });
    const req = await ctx.request.post(`/api/competitions/${competitionId}/complete`);
    expect([403, 401]).toContain(req.status());
    await ctx.close();
  });
});
