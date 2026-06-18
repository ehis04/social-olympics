// Shared E2E helpers for common page interactions
import type { Page } from '@playwright/test';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('textbox', { name: /^password$/i }).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
}

export async function waitForToast(page: Page, text: string | RegExp) {
  await page.getByText(text).waitFor({ state: 'visible', timeout: 8_000 });
}

export async function navigateToCompetition(page: Page, competitionId: string) {
  await page.goto(`/competitions/${competitionId}/feed`);
}

export async function navigateToEvent(page: Page, competitionId: string, eventId: string) {
  await page.goto(`/competitions/${competitionId}/events/${eventId}`);
}

export function getCompetitionId(): string {
  const id = process.env.E2E_COMPETITION_ID;
  if (!id) throw new Error('E2E_COMPETITION_ID env var is required');
  return id;
}

export function getEventId(): string {
  const id = process.env.E2E_EVENT_ID;
  if (!id) throw new Error('E2E_EVENT_ID env var is required');
  return id;
}
