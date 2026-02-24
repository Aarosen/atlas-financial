import { expect, test } from '@playwright/test';

test('R4: scroll away shows Jump to latest, clicking returns to bottom', async ({ page }) => {
  await page.goto('/debug/conversation?case=scroll');

  const sc = page.getByTestId('conversationScroll');
  await expect(sc).toBeVisible();

  // Scroll away from bottom.
  await sc.evaluate((el) => {
    el.scrollTop = 0;
  });

  const jump = page.getByTestId('jumpToLatest');
  await expect(jump).toBeVisible();

  await jump.click();

  // After clicking jump, we should be near bottom.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="conversationScroll"]');
    if (!el) return false;
    const dist = (el as HTMLElement).scrollHeight - (el as HTMLElement).scrollTop - (el as HTMLElement).clientHeight;
    return dist < 160;
  });
});

test('R4: conversation visual states are renderable (debug route)', async ({ page }, testInfo) => {
  // Skip snapshot tests on CI (Linux platform) - only run on local (Darwin)
  if (process.env.CI) {
    testInfo.skip();
    return;
  }

  const cases = ['idle', 'typing', 'error', 'streaming'] as const;

  // Stabilize screenshots across platforms (avoid blinking caret / focus ring differences).
  await page.addStyleTag({ content: '*{caret-color: transparent !important;}' });

  for (const c of cases) {
    await page.goto(`/debug/conversation?case=${c}`);
    await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();

    await page.evaluate(() => {
      const ae = document.activeElement as any;
      if (ae && typeof ae.blur === 'function') ae.blur();
    });

    await expect(page).toHaveScreenshot(`conversation-${c}.png`, {
      fullPage: true,
      ...((c === 'typing' || c === 'error' || c === 'streaming') ? { maxDiffPixelRatio: 0.02 } : null),
    });
  }
});
