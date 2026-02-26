import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Page, Route } from '@playwright/test';

async function installApiMocks(page: Page) {
  await page.route('**/api/chat', async (route: Route) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'Okay.', source: 'mock', model: 'mock' }),
    });
  });
}

test('R7: axe baseline - landing', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('R7: axe baseline - conversation', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');
  await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('R7: axe baseline - dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard not ready yet')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('R7: keyboard navigation - landing, conversation, dashboard', async ({ page }) => {
  await page.goto('/');
  const landingStart = page.getByRole('link', { name: 'Start a conversation →' });
  for (let i = 0; i < 10; i += 1) {
    if (await landingStart.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(landingStart).toBeFocused();

  await page.goto('/conversation');
  await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  const convoInput = page.locator('textarea');
  for (let i = 0; i < 8; i += 1) {
    if (await convoInput.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(convoInput).toBeFocused();
  await page.keyboard.type('Income $4000/month.');

  const sendButton = page.getByLabel('Send message');
  for (let i = 0; i < 6; i += 1) {
    if (await sendButton.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(sendButton).toBeFocused();

  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard not ready yet')).toBeVisible();
  const dashboardCta = page.getByRole('button', { name: 'Go to conversation →' });
  for (let i = 0; i < 6; i += 1) {
    if (await dashboardCta.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(dashboardCta).toBeFocused();
});
