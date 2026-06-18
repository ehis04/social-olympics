// Auth setup — logs in as test user and saves session storage state
import { test as setup, expect } from '@playwright/test';
import { AUTH_FILE, HOST_AUTH_FILE } from './auth-state';

setup('authenticate as competitor', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL!);
  await page.getByRole('textbox', { name: /^password$/i }).fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: AUTH_FILE });
});

setup('authenticate as host', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.E2E_HOST_EMAIL!);
  await page.getByRole('textbox', { name: /^password$/i }).fill(process.env.E2E_HOST_PASSWORD!);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: HOST_AUTH_FILE });
});
