/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  GOLDEN PATH — IMMUTABLE TEST                                        ║
 * ║                                                                      ║
 * ║  This test encodes the one journey every Atlas customer takes.       ║
 * ║  If it goes red, THE CODE IS WRONG — NOT THE TEST.                   ║
 * ║                                                                      ║
 * ║  Editing this file to make it pass is forbidden. Any change to the   ║
 * ║  assertions below requires a written justification in the PR         ║
 * ║  description, reviewed by a second person, explaining why the        ║
 * ║  customer journey itself legitimately changed.                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
import { expect, test } from '@playwright/test';
import { waitForAppReady } from './helpers';

test.describe('Golden path — guest onboarding to first reasoned answer', () => {
  test('completes onboarding, sees confirm card, tier, lever, and a calculation-grounded follow-up', async ({ page }) => {
    // 1. Guest opens the conversation surface
    await page.goto('/conversation');
    await waitForAppReady(page);

    // 2. Onboarding with realistic numbers.
    const input = page.getByRole('textbox', { name: /message|input|type/i });
    const send = page.getByRole('button', { name: /send|submit/i });

    // First message: income and essentials
    await input.fill('I make $5,000 a month and spend about $3,000 on essentials.');
    await send.click();
    await expect(page.locator('[data-testid="atlas-message"]').last()).toBeVisible({ timeout: 15000 });

    // Second message: savings
    await input.fill('I have $4,000 in savings.');
    await send.click();
    await expect(page.locator('[data-testid="atlas-message"]').last()).toBeVisible({ timeout: 15000 });

    // Third message: debt
    await input.fill('I have $2,000 in credit card debt at 22%, no other debt.');
    await send.click();

    // 3. CONFIRM card appears (user should see their financial summary)
    const confirmCard = page.locator('[data-testid="confirm-card"]');
    await expect(confirmCard).toBeVisible({ timeout: 20000 });

    // 4. Confirm the data
    const confirmButton = page.getByRole('button', { name: /confirm|yes|looks right/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // 5. A tier appears (user sees their financial tier)
    const tierReveal = page.locator('[data-testid="tier-reveal"]');
    await expect(tierReveal).toBeVisible({ timeout: 20000 });

    // 6. A lever / next-step appears (user sees recommended action)
    const leverCard = page.locator('[data-testid="lever-card"]');
    await expect(leverCard).toBeVisible({ timeout: 20000 });

    // 7. A follow-up question gets a coherent, calculation-grounded answer
    await input.fill('Why that step first?');
    await send.click();
    const answer = page.locator('[data-testid="atlas-message"]').last();
    await expect(answer).toBeVisible({ timeout: 20000 });
    
    // The answer must be substantive (not "I cannot help" or generic)
    const answerText = await answer.textContent();
    expect(answerText).toBeTruthy();
    expect(answerText).not.toContain('I cannot help');
    expect(answerText).not.toContain('as an AI');
  });
});
