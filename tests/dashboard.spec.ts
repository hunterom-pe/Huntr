import { test, expect } from '@playwright/test';

test.describe('Dashboard Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Perform login before each test
    await page.goto('/login');
    await page.locator('button:has-text("Login to Sandbox")').click();
    await page.waitForURL('**/dashboard');
  });

  test('should navigate to dashboard and switch tabs', async ({ page }) => {
    // Go to dashboard (should work now that we are logged in)
    await page.goto('/dashboard');
    
    // 1. Verify Overview is active
    await expect(page.locator('h1')).toContainText(/overview|applications/i, { timeout: 10000 });
    
    // 2. Click Applications tab in sidebar
    await page.getByText('Applications', { exact: true }).click();
    
    // 3. Verify Applications header
    await expect(page.locator('h1')).toContainText(/applications/i, { timeout: 10000 });
    
    // 4. Go back to overview
    await page.getByText('Overview', { exact: true }).click();
    await expect(page.locator('h1')).toContainText(/overview/i, { timeout: 10000 });
  });

  test('should show correct system status with user email', async ({ page }) => {
    await page.goto('/dashboard');
    const statusText = page.locator('div[class*="systemStatus"]');
    await expect(statusText).toContainText(/test@example\.com/i, { timeout: 15000 });
  });
});
