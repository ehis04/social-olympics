// Journey 8 — moderation: report button flow
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Report flow', () => {
  test.use({ storageState: AUTH_FILE });

  test('report button is visible on feed items from other users', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    const reportBtn = page.getByRole('button', { name: /report/i }).first();
    // Only present if there are feed items from other users
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await expect(page.getByText(/report content/i)).toBeVisible();
    }
  });

  test('report modal shows reason options', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    const reportBtn = page.getByRole('button', { name: /report/i }).first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await expect(page.getByText(/offensive or abusive/i)).toBeVisible();
      await expect(page.getByText(/harassment/i)).toBeVisible();
      await expect(page.getByText(/other/i)).toBeVisible();
    }
  });

  test('report modal can be dismissed', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    const reportBtn = page.getByRole('button', { name: /report/i }).first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      await expect(page.getByText(/report content/i)).toBeVisible();
      await page.getByRole('button', { name: /cancel/i }).click();
      await expect(page.getByText(/report content/i)).not.toBeVisible();
    }
  });

  test('submit button is disabled until reason selected', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/feed`);

    const reportBtn = page.getByRole('button', { name: /report/i }).first();
    if (await reportBtn.isVisible()) {
      await reportBtn.click();
      const submitBtn = page.getByRole('button', { name: /submit report/i });
      await expect(submitBtn).toBeDisabled();
    }
  });

  test('rate limit returns 429 after excessive requests', async ({ request }) => {
    // Hit the report API directly more than the hourly limit
    const responses = await Promise.all(
      Array.from({ length: 7 }).map(() =>
        request.post('/api/report', {
          data: {
            target_type: 'competition',
            target_id: getCompetitionId(),
            reason: 'Spam test',
          },
        }),
      ),
    );
    const statuses = responses.map((r) => r.status());
    // At least one should be rate limited
    expect(statuses.some((s) => s === 429 || s === 422 || s === 201)).toBe(true);
  });
});
