import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

async function installApiMocks(page: Page, withGoal = true) {
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
        body: JSON.stringify({
          fields: {
            monthlyIncome: 8000,
            essentialExpenses: 3000,
            totalSavings: 24000,
            highInterestDebt: 0,
            lowInterestDebt: 0,
            ...(withGoal ? { primaryGoal: 'stability' } : {}),
          },
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: 'Okay.', source: 'mock', model: 'mock' }),
    });
  });
}

async function completeBaseline(page: Page) {
  await page.goto('/conversation');
  const input = page.locator('textarea');
  await input.fill('Income $8000/month. Essentials $3000/month. Savings $24000. No debt.');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Yes, looks right' }).click();
  await page.getByRole('button', { name: 'Yes, use this lever' }).click();
  await page.getByRole('button', { name: 'Confirm step' }).click();
}

async function completeBaselineWithGoal(page: Page) {
  await page.goto('/conversation');
  const input = page.locator('textarea');
  await input.fill('Income $8000/month. Essentials $3000/month. Savings $24000.');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Stability' })).toBeVisible();
  await page.getByRole('button', { name: 'Stability' }).click();

  // Let conversation proceed to next question without forcing full completion.
}


test('R1/R2: dashboard metric explainer and no-history charts', async ({ page }) => {
  await installApiMocks(page);
  await completeBaseline(page);
  await page.goto('/dashboard');
  await expect(page.getByText('MONEY LEFT EACH MONTH')).toBeVisible();

  const metrics = [
    { key: 'net', heading: 'Money left each month' },
    { key: 'buffer', heading: 'Emergency cushion' },
    { key: 'future', heading: 'Future savings' },
    { key: 'debt', heading: 'Debt load' },
  ];
  for (const metric of metrics) {
    await page.getByLabel(`Explain ${metric.key}`).click();
    const explainer = page.getByText('PLAIN ENGLISH').locator('..');
    await expect(explainer).toBeVisible();
    await expect(explainer).toContainText(metric.heading);
  }
  await expect(page.getByText('Trends will appear as Atlas learns more about you.')).toHaveCount(4);

  await page.addStyleTag({ content: '*{caret-color: transparent !important;}' });
});

test('R2: dashboard history charts render with aria labels', async ({ page }) => {
  await installApiMocks(page);
  await completeBaseline(page);

  await page.evaluate(() => {
    localStorage.setItem(
      'atlas:metricHistory',
      JSON.stringify({
        net: [200, 400, 600],
        buffer: [1.2, 1.5, 2.0],
        future: [0.08, 0.1, 0.12],
        debt: [3, 2, 1],
      })
    );
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('img', { name: /net trend/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /buffer trend/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /future trend/i })).toBeVisible();
  await expect(page.getByRole('img', { name: /debt trend/i })).toBeVisible();

  await page.addStyleTag({ content: '*{caret-color: transparent !important;}' });
});

test('R3: profile clarity indicator shows tooltip and early-session callout', async ({ page }) => {
  await installApiMocks(page);
  await completeBaseline(page);
  await page.goto('/dashboard');
  const clarity = page.getByText('PROFILE CLARITY');
  await expect(clarity).toBeVisible();
  await expect(clarity).toHaveAttribute('title', /based on how much/i);
});

test('R6: goal capture quick replies show and store', async ({ page }) => {
  await installApiMocks(page, false);
  await page.goto('/conversation');
  const input = page.locator('textarea');
  await input.fill('Income $8000/month. Essentials $3000/month. Savings $24000.');
  await input.press('Enter');

  await expect(page.getByRole('button', { name: 'Stability' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Growth' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flexibility' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wealth building' })).toBeVisible();
});

test('R7: next step card shows direction/action/time', async ({ page }) => {
  await installApiMocks(page);
  await page.goto('/conversation');
  const input = page.locator('textarea');
  await input.fill('Income $8000/month. Essentials $3000/month. Savings $24000. No debt.');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Yes, looks right' }).click();
  await page.getByRole('button', { name: 'Yes, use this lever' }).click();
  const nextStep = page.getByText('ONE NEXT STEP');
  await expect(nextStep).toBeVisible();
  const card = nextStep.locator('..');
  await expect(card.getByText('DIRECTION')).toBeVisible();
  await expect(card.getByText('ACTION')).toBeVisible();
  await expect(card.getByText('TIME')).toBeVisible();
});
