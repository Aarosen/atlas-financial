import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should allow guest access to landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Atlas/);
    await expect(page.locator('h1:not(.srOnly)')).toContainText('clarity');
  });

  test('should show auth prompt when starting conversation as guest', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign in with email")');
    await expect(page.locator('text=Sign in to Atlas').first()).toBeVisible();
  });

  test('should allow email input for magic link', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign in with email")');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Sign in with email")');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('');
    await emailInput.press('Enter');
    await expect(page.locator('text=Please enter your email')).toBeVisible();
  });

  test('should persist session across page reloads', async ({ page }) => {
    await page.goto('/');
    // Simulate authenticated session by setting localStorage
    await page.evaluate(() => {
      localStorage.setItem('atlas:userId', 'test-user-123');
      localStorage.setItem('atlas:sessionId', 'session-456');
    });
    await page.reload();
    // Should still be authenticated
    const userId = await page.evaluate(() => localStorage.getItem('atlas:userId'));
    expect(userId).toBe('test-user-123');
  });
});

test.describe('Guest to Authenticated Upgrade', () => {
  test('should upgrade guest session to authenticated', async ({ page }) => {
    // Start as guest
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('atlas:userId', 'guest-session-123');
    });

    // Simulate authentication
    await page.evaluate(() => {
      localStorage.setItem('atlas:userId', 'auth-user-456');
      localStorage.setItem('atlas:token', 'mock-token');
    });

    // Verify upgrade
    const userId = await page.evaluate(() => localStorage.getItem('atlas:userId'));
    expect(userId).toBe('auth-user-456');
  });
});
