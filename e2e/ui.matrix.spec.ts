import { expect, test } from '@playwright/test';

test('ui matrix screenshots: buttons + cards + inputs', async ({ page }, testInfo) => {
  // Skip snapshot tests on CI (Linux platform) - only run on local (Darwin)
  if (process.env.CI) {
    testInfo.skip();
    return;
  }

  await page.goto('/debug/ui');
  await expect(page.getByRole('heading', { name: 'UI Components Matrix' })).toBeVisible();
  
  // Stabilize screenshots
  await page.addStyleTag({ content: '*{caret-color: transparent !important;}' });
  
  await expect(page).toHaveScreenshot('ui-matrix.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});
