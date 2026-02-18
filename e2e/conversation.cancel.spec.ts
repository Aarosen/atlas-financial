import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

async function installApiMocks(page: Page) {
  await page.route('**/api/chat', async (route: Route) => {
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
        body: JSON.stringify({ fields: { monthlyIncome: 4000, essentialExpenses: 2000, totalSavings: 0, highInterestDebt: 0, lowInterestDebt: 0 }, source: 'mock', model: 'mock' }),
      });
    }

    if (body?.type === 'answer_stream' || body?.type === 'answer_explain_stream') {
      const question = String(body?.question || '');
      const slow = question.toLowerCase().includes('slowstream');
      const frames = slow
        ? Array.from({ length: 40 }).map((_, i) => 'data: ' + JSON.stringify({ delta: `chunk${i + 1} ` }) + '\n\n')
        : ['data: ' + JSON.stringify({ delta: 'Okay. ' }) + '\n\n'];
      const sse = [...frames, 'data: ' + JSON.stringify({ done: true, model: 'mock' }) + '\n\n'].join('');
      return route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
        body: sse,
      });
    }

    if (body?.type === 'answer' || body?.type === 'answer_explain') {
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

test('R4: Cancel stops streaming and returns to idle', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');

  // Trigger streaming path: any message with '?' is treated as followup_question.
  await input.fill('slowstream?');
  await input.press('Enter');

  const cancel = page.getByRole('button', { name: 'Cancel response' });
  await expect(cancel).toBeVisible();

  const lastA = page.getByTestId('lastAssistantBubble');
  await expect(lastA).toBeVisible();
  // Wait for at least one streaming delta so we know we're in-stream.
  await expect(lastA).toContainText('chunk', { timeout: 10_000 });
  const before = await lastA.textContent();

  await cancel.click();

  await expect(cancel).toBeHidden();

  // Ensure streaming has actually stopped (no more deltas appended after cancel).
  await page.waitForTimeout(1200);
  const after = await lastA.textContent();
  expect(after || '').toContain(before || '');
  expect(after || '').toMatch(/canceled/i);

  // If cancel worked, we should not have advanced to a later chunk.
  expect(after || '').not.toMatch(/chunk2\b/i);
});
