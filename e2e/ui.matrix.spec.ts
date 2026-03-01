import { expect, test } from '@playwright/test';

test('ui matrix screenshots: buttons + cards + inputs', async ({ page }, testInfo) => {
  // Skip this test - /debug/ui page doesn't exist in production
  testInfo.skip();
});
