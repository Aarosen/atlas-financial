import type { Page } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  // data-atlas-ready is set synchronously in the mount effect — resolves as soon
  // as React has hydrated and AtlasApp has mounted on the client.
  await page.waitForSelector('[data-atlas-ready="true"]', { timeout: 8000 });
}

export async function dismissOnboardingIfPresent(page: Page): Promise<void> {
  const skipBtn = page.locator('button:has-text("Skip")');
  try {
    const isVisible = await skipBtn.isVisible({ timeout: 2000 });
    if (isVisible) {
      await skipBtn.click();
    }
  } catch {
    // Overlay not present, continue
  }
}
