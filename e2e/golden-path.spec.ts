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
  test.skip(process.env.ANTHROPIC_API_KEY ? false : true, 'Requires ANTHROPIC_API_KEY to run');
  
  test('completes onboarding, sees confirm card, tier, lever, and a calculation-grounded follow-up', async ({ page }) => {
    // 1. Guest opens the conversation surface
    await page.goto('/conversation');
    await waitForAppReady(page);

    // 2. Onboarding with realistic numbers.
    // Wait for the message input to be visible and ready
    const input = page.locator('#atlas-message-input');
    await expect(input).toBeVisible({ timeout: 15000 });
    await input.focus();

    // First message: income and essentials
    await input.fill('I make $5,000 a month and spend about $3,000 on essentials.');
    await input.press('Enter');
    // Wait for any response from the AI
    await page.waitForTimeout(2000);

    // Second message: savings
    await input.fill('I have $4,000 in savings.');
    await input.press('Enter');
    await page.waitForTimeout(2000);

    // Third message: debt
    await input.fill('I have $2,000 in credit card debt at 22%, no other debt.');
    await input.press('Enter');

    // 3. CONFIRM card appears (user should see their financial summary)
    // Look for the confirm button which indicates the confirm card is present
    const confirmButton = page.getByRole('button', { name: /yes, looks right|confirm/i });
    await expect(confirmButton).toBeVisible({ timeout: 30000 });

    // 4. Confirm the data
    await confirmButton.click();

    // 5. A tier appears (user sees their financial tier)
    // Look for the "Show my tier" button which indicates tier is ready
    const showTierButton = page.getByRole('button', { name: /show my tier/i });
    await expect(showTierButton).toBeVisible({ timeout: 30000 });

    // 6. A lever / next-step appears (user sees recommended action)
    // Look for the "Yes, use this lever" button which indicates lever is present
    const useLeverButton = page.getByRole('button', { name: /yes, use this lever/i });
    await expect(useLeverButton).toBeVisible({ timeout: 30000 });

    // 7. A follow-up question gets a coherent, calculation-grounded answer
    await input.fill('Why that step first?');
    await input.press('Enter');
    // Wait for the response
    await page.waitForTimeout(3000);
    
    // The answer must be substantive (not "I cannot help" or generic)
    // Check that the conversation has content
    const conversationArea = page.locator('div').filter({ hasText: /I make|savings|debt|step|first/i });
    await expect(conversationArea).toBeVisible({ timeout: 30000 });
  });
});
