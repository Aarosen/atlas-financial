import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

function mockExtractForUserText(userText: string) {
  const t = userText.toLowerCase();
  const fields: Record<string, unknown> = {};

  const num = (re: RegExp) => {
    const m = userText.match(re);
    if (!m) return null;
    return Number(String(m[1]).replace(/,/g, ''));
  };

  const inc = num(/(?:income|make|take\s*home)\D*\$?(\d[\d,]*)/i);
  if (inc !== null && inc > 0) fields.monthlyIncome = inc;

  const ess = num(/(?:essentials|rent|expenses)\D*\$?(\d[\d,]*)/i);
  if (ess !== null && ess > 0) fields.essentialExpenses = ess;

  if (t.includes('savings')) {
    const sav = num(/(?:savings|saved)\D*\$?(\d[\d,]*)/i);
    if (sav !== null && sav >= 0) fields.totalSavings = sav;
    if (t.includes('no savings')) fields.totalSavings = 0;
  }
  if (t.includes('no debt')) {
    fields.highInterestDebt = 0;
    fields.lowInterestDebt = 0;
  }
  if (t.includes('credit card') || t.includes('high interest')) {
    const v = num(/\$?(\d[\d,]*)/i);
    if (v !== null) fields.highInterestDebt = v;
  }
  if (t.includes('student') || t.includes('car') || t.includes('mortgage') || t.includes('low interest')) {
    const v = num(/\$?(\d[\d,]*)/i);
    if (v !== null) fields.lowInterestDebt = v;
  }

  return fields;
}

async function installApiMocks(page: Page) {
  let extractFailOnce = true;
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
      const userText = String(body?.messages?.[0]?.content || '');

      // Reliability test: fail once to ensure Retry works.
      if (extractFailOnce && userText.toLowerCase().includes('retrytest')) {
        extractFailOnce = false;
        return route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'proxy_error_502' }),
        });
      }

      const fields = mockExtractForUserText(userText);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fields, source: 'mock', model: 'mock' }),
      });
    }

    if (body?.type === 'answer_stream') {
      const question = String(body?.question || '');
      const slow = question.toLowerCase().includes('slowstream');
      const frames = slow
        ? Array.from({ length: 40 }).map((_, i) => 'data: ' + JSON.stringify({ delta: `chunk${i + 1} ` }) + '\n\n')
        : ['data: ' + JSON.stringify({ delta: 'Good question. ' }) + '\n\n'];
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

    if (body?.type === 'answer') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ text: 'Good question.', source: 'mock', model: 'mock' }),
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

test('1) happy path onboarding → tier reveal', async ({ page }: { page: Page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');

  await input.fill('Income $8000/month. Essentials $3000/month. Savings $24000. No debt.');
  await input.press('Enter');

  await expect(page.getByText('Here’s what I heard')).toBeVisible();
  await page.getByRole('button', { name: 'Show my tier →' }).click();
  await expect(page.getByText('Your best next lever')).toBeVisible();
});

test('2) interruption → resume', async ({ page }: { page: Page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');
  await input.fill('My income is $4000/month.');
  await input.press('Enter');

  // Meta interruption should be answered locally and then resume asking.
  await input.fill('What do you store and send?');
  await input.press('Enter');

  await expect(
    page.getByText(
      'Messages you type may be sent to our AI provider to generate responses',
      { exact: false }
    )
  ).toBeVisible();
});

test('6) retry recovers from temporary API error', async ({ page }: { page: Page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');

  await input.fill('retrytest Income $4000/month.');
  await input.press('Enter');

  await expect(page.getByRole('button', { name: 'Retry last message' })).toBeVisible();
  await expect(page.getByText('Connection issue — retry when you’re ready.')).toBeVisible();

  await page.getByRole('button', { name: 'Retry last message' }).click();

  const essentialsQ = page
    .locator('div')
    .filter({ hasText: /essentials.*month|month.*essentials/i })
    .first();
  await expect(essentialsQ).toBeVisible();
});

test('3) edit last message → replay', async ({ page }: { page: Page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');

  // Single onboarding message so the last user message is the one we edit.
  await input.fill('Income 2000. Essentials 2500. Savings 0. No debt.');
  await input.press('Enter');

  await page.getByRole('button', { name: 'Show my tier →' }).click();
  await expect(page.getByText('Foundation')).toBeVisible();

  // Go back to conversation and edit the last user message.
  await page.getByRole('button', { name: 'Keep talking' }).click();

  // Click last user message bubble
  await page.getByTestId('lastUserBubble').click();
  await expect(input).not.toHaveValue('');

  await input.fill('Income 8000. Essentials 2500. Savings 20000. No debt.');
  await input.press('Enter');

  await page.getByRole('button', { name: 'Show my tier →' }).click();
  await expect(page.getByText('Growth Ready')).toBeVisible();
});

test('4) voice toggle shows (capability mock)', async ({ page }: { page: Page }) => {
  await page.addInitScript(() => {
    (window as any).webkitSpeechRecognition = function () {};
  });
  await installApiMocks(page);
  await page.goto('/conversation');

  await expect(page.getByLabel('Voice input')).toBeVisible();
});

test('5) privacy text present and accurate', async ({ page }: { page: Page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');

  const input = page.locator('textarea');
  await input.fill('My income is $4000/month.');
  await input.press('Enter');

  await input.fill('What do you store and send?');
  await input.press('Enter');

  await expect(
    page.getByText(
      'Messages you type may be sent to our AI provider to generate responses',
      { exact: false }
    )
  ).toBeVisible();
});
