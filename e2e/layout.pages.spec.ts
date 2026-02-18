import { expect, test } from '@playwright/test';

const pages: Array<{ name: string; path: string }> = [
  { name: 'landing', path: '/' },
  { name: 'how-it-works', path: '/how-it-works' },
  { name: 'product', path: '/product' },
  { name: 'privacy', path: '/privacy' },
  { name: 'conversation', path: '/conversation' },
  { name: 'dashboard', path: '/dashboard' },
];

test('R5: layout snapshots across key pages', async ({ page }) => {
  // Stabilize screenshots across platforms (avoid blinking caret / focus ring differences).
  await page.addStyleTag({ content: '*{caret-color: transparent !important;}' });

  for (const p of pages) {
    await page.goto(p.path);

    await page.evaluate(() => {
      const ae = document.activeElement as any;
      if (ae && typeof ae.blur === 'function') ae.blur();
    });

    await expect(page).toHaveScreenshot(`page-${p.name}.png`, {
      fullPage: true,
      ...(p.name === 'conversation' ? { maxDiffPixelRatio: 0.03 } : null),
    });
  }
});
