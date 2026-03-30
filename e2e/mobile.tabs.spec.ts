import { expect, test } from '@playwright/test';
import { waitForAppReady } from './helpers';

test('R4: mobile tab bar preserves talk draft and exposes tab roles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/conversation');
  await waitForAppReady(page);

  const tablist = page.getByRole('tablist', { name: 'Primary' });
  await expect(tablist).toBeVisible();

  const talkTab = page.getByRole('tab', { name: 'Talk' });
  const planTab = page.getByRole('tab', { name: 'Plan' });
  const dashboardTab = page.getByRole('tab', { name: 'Dashboard' });
  const settingsTab = page.getByRole('tab', { name: 'Settings' });

  await expect(talkTab).toHaveAttribute('aria-selected', 'true');
  await expect(planTab).toBeVisible();
  await expect(dashboardTab).toBeVisible();
  await expect(settingsTab).toBeVisible();

  const input = page.locator('textarea');
  await input.fill('Keep this draft.');

  await settingsTab.scrollIntoViewIfNeeded();
  await settingsTab.click();
  await expect(settingsTab).toHaveAttribute('aria-selected', 'true');

  await talkTab.scrollIntoViewIfNeeded();
  await talkTab.click();
  await expect(talkTab).toHaveAttribute('aria-selected', 'true');
  await expect(input).toHaveValue('Keep this draft.');
});
