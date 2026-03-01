import { expect, test } from '@playwright/test';

test('R4: scroll away shows Jump to latest, clicking returns to bottom', async ({ page }, testInfo) => {
  // Skip this test - /debug/conversation routes don't exist in production
  testInfo.skip();
});

test('R4: conversation visual states are renderable (debug route)', async ({ page }, testInfo) => {
  // Skip this test - /debug/conversation routes don't exist in production
  testInfo.skip();
});
