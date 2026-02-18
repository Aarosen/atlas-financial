import { expect, test } from '@playwright/test';

async function installApiMocks(page: any) {
  await page.route('**/api/chat', async (route: any) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    let body: any = {};
    try {
      body = req.postDataJSON();
    } catch {
      body = {};
    }

    if (body?.type === 'extract') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fields: { monthlyIncome: 8000, essentialExpenses: 2500, totalSavings: 20000, highInterestDebt: 0, lowInterestDebt: 0 }, source: 'mock', model: 'mock' }),
      });
    }

    if (body?.type === 'answer_stream') {
      const sse = ['data: ' + JSON.stringify({ delta: 'Okay. ' }) + '\n\n', 'data: ' + JSON.stringify({ done: true, model: 'mock' }) + '\n\n'].join('');
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
        body: sse,
      });
    }

    if (body?.type === 'answer') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: 'Okay.', source: 'mock', model: 'mock' }),
      });
    }

    if (body?.type === 'chat') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: 'Okay.', source: 'mock', model: 'mock' }),
      });
    }

    return route.fallback();
  });
}

test('R4: edit-last affordance appears on hover (desktop) and triggers edit flow', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');
  await input.fill('Income 2000. Essentials 2500. Savings 0. No debt.');
  await input.press('Enter');

  // Move through summary/tier so the last user bubble is editable in conversation.
  await page.getByRole('button', { name: 'Show my tier →' }).click();
  await page.getByRole('button', { name: 'Keep talking' }).click();

  const bubble = page.getByTestId('lastUserBubble');
  await expect(bubble).toBeVisible();

  // Hover should reveal the pencil affordance.
  await bubble.hover();

  const edit = page.getByLabel('Edit last message');
  await expect(edit).toBeVisible();
  await edit.click();

  await expect(input).toHaveValue(/Income 2000/);
});

test('R4: edit-last affordance appears on long-press (mobile)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only');

  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');
  await input.fill('Income 2000. Essentials 2500. Savings 0. No debt.');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Show my tier →' }).click();
  await page.getByRole('button', { name: 'Keep talking' }).click();

  const bubble = page.getByTestId('lastUserBubble');
  await expect(bubble).toBeVisible();

  // Long-press ~450ms to reveal the affordance.
  await bubble.dispatchEvent('pointerdown');
  await page.waitForTimeout(600);
  await bubble.dispatchEvent('pointerup');

  await expect(page.getByLabel('Edit last message')).toBeVisible();
});
