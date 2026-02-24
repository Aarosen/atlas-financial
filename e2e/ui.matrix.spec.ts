import { expect, test } from '@playwright/test';

test('ui matrix screenshots: buttons + cards + inputs', async ({ page }, testInfo) => {
  // Skip snapshot tests on CI (Linux platform) - only run on local (Darwin)
  if (process.env.CI) {
    testInfo.skip();
    return;
  }

  await page.goto('/debug/ui');

  // Ensure fonts/layout settle.
  await expect(page.getByText('UI Matrix')).toBeVisible();

  await expect(page).toHaveScreenshot('ui-matrix.png', { fullPage: true });
});
