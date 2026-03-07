import type { Page } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  // data-atlas-ready is set synchronously in the mount effect — resolves as soon
  // as React has hydrated and AtlasApp has mounted on the client.
  await page.waitForSelector('[data-atlas-ready="true"]', { timeout: 8000 });
}
