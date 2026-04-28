import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully via sandbox credentials', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login');
    
    // 2. Verify login page elements
    await expect(page.locator('h1')).toContainText('Welcome Back');
    
    // 3. Click Sandbox Login
    const sandboxBtn = page.getByRole('button', { name: /login to sandbox/i });
    await expect(sandboxBtn).toBeVisible({ timeout: 10000 });
    await sandboxBtn.click();
    
    // 4. Verify redirection to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // 5. Verify session state in sidebar system status
    const systemStatus = page.locator('div[class*="systemStatus"]');
    await expect(systemStatus).toContainText(/test@example\.com/i, { timeout: 20000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page.locator('h1')).toContainText('Welcome Back');
  });
});
