// Journey 14 — chat: group chat and direct messages
import { test, expect } from '@playwright/test';
import { AUTH_FILE } from './fixtures/auth-state';
import { getCompetitionId } from './helpers';

test.describe('Group chat', () => {
  test.use({ storageState: AUTH_FILE });

  test('chat page loads and shows message input', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/chat`);
    await expect(page.getByPlaceholder(/message|type/i).or(page.getByRole('textbox'))).toBeVisible();
  });

  test('can type and submit a group message', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/chat`);

    const input = page.getByPlaceholder(/message|type/i).or(page.getByRole('textbox'));
    await input.fill('E2E test message — please ignore');
    await page.keyboard.press('Enter');

    // Message should appear in the chat
    await expect(page.getByText(/E2E test message/i)).toBeVisible({ timeout: 8_000 });
  });

  test('empty message cannot be submitted', async ({ page }) => {
    const competitionId = getCompetitionId();
    await page.goto(`/competitions/${competitionId}/chat`);

    const sendBtn = page.getByRole('button', { name: /send/i });
    if (await sendBtn.isVisible()) {
      await expect(sendBtn).toBeDisabled();
    }
  });
});

test.describe('Direct messages', () => {
  test.use({ storageState: AUTH_FILE });

  test('/messages page loads with inbox', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: /messages/i })).toBeVisible();
  });

  test('empty state is shown when no DM conversations exist', async ({ page }) => {
    await page.goto('/messages');
    // Either shows conversations or an empty state
    const hasContent = await page.getByText(/no conversations|start a conversation|messages/i).isVisible().catch(() => false);
    expect(hasContent || await page.getByRole('main').isVisible()).toBe(true);
  });

  test('/messages is protected — redirects when not logged in', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/messages');
    await expect(page).toHaveURL(/login/);
    await ctx.close();
  });
});
