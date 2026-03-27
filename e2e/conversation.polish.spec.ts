import { expect, test } from '@playwright/test';

test('R4: scroll away shows Jump to latest, clicking returns to bottom', async ({ page }) => {
  await page.goto('/debug/conversation?case=scroll');

  const sc = page.getByTestId('conversationScroll');
  await expect(sc).toBeVisible();

  // Wait until the scroll container actually has overflow content (50 messages loaded client-side)
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="conversationScroll"]');
    if (!el) return false;
    return (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight + 200;
  }, { timeout: 10000 });

  // Ensure we start at the bottom (defensive — flex-end or auto-scroll should already do this)
  await sc.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  // Scroll away from bottom and explicitly dispatch scroll event so React listener fires
  await sc.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event('scroll'));
  });

  // Wait for React to re-render and button to appear (expect has 10s timeout from config)
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
  // Skip snapshot tests on CI only - run on local machines
  if (process.env.CI) {
    testInfo.skip();
    return;
  }

  const cases = ['idle', 'typing', 'error', 'streaming'] as const;

  // Stabilize screenshots across platforms
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
      maxDiffPixelRatio: 0.05,
    });
  }
});
