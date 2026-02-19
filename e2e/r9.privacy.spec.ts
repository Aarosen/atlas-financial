import { expect, test } from '@playwright/test';

async function createBaseline(page: any) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/chat', async (route: any) => {
    const req = route.request();
    if (req.method() !== 'POST') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fields: { monthlyIncome: 4000, essentialExpenses: 2500, totalSavings: 1000, highInterestDebt: 500, lowInterestDebt: 0, primaryGoal: 'stability' } }),
    });
  });

  await page.goto('/conversation');
  await page.locator('textarea').fill('Income 4000, essentials 2500, savings 1000, debt 500.');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Yes, looks right' }).click();
  await page.getByRole('button', { name: 'Yes, use this lever' }).click();
  await page.getByRole('button', { name: 'Confirm step' }).click();
}

test('R9: delete local data resets baseline', async ({ page }) => {
  await createBaseline(page);

  await page.getByRole('tablist', { name: 'Primary' }).waitFor();
  await page.getByRole('tab', { name: 'Settings' }).click({ force: true });
  page.once('dialog', (dlg) => dlg.accept());
  await page.getByRole('button', { name: 'Delete local data' }).click({ force: true, noWaitAfter: true });

  await page.goto('/dashboard');
  await expect(page.getByText('Dashboard not ready yet')).toBeVisible();
});
