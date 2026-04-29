import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully via sandbox credentials', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login');
    
    // 2. Verify login page elements
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    
    // 3. Click Sandbox Login
    const sandboxBtn = page.getByRole('button', { name: /enter sandbox/i });
    await expect(sandboxBtn).toBeVisible({ timeout: 10000 });
    await sandboxBtn.click();
    
    // 4. After login, new users (no profile) go to home page, returning users go to dashboard
    // Wait for either destination
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });
    
    // 5. Verify we're authenticated by checking for user-specific content
    // On home page: the header shows the email and a "Dashboard" link
    // On dashboard: the sidebar shows the email in systemStatus
    const pageUrl = page.url();
    if (pageUrl.includes('/dashboard')) {
      const systemStatus = page.locator('div[class*="systemStatus"]');
      await expect(systemStatus).toContainText(/test@example\.com/i, { timeout: 20000 });
    } else {
      // Home page — verify authenticated state in nav
      await expect(page.locator('header')).toContainText(/test@example\.com|Dashboard/i, { timeout: 15000 });
    }
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });
});
