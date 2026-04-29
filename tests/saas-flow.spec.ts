import { test, expect } from '@playwright/test';

test.describe('Huntr SaaS User Journey', () => {

  test('dashboard features: manual entry and pipeline tracking', async ({ page }) => {
    // 1. Login to Sandbox
    await page.goto('/login');
    await page.click('button:has-text("Enter Sandbox (Demo)")');
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // 2. Navigate to Job Pipeline tab
    await page.locator('nav').getByText('Job Pipeline', { exact: true }).click();
    await expect(page.locator('main h1')).toContainText(/pipeline/i, { timeout: 10000 });

    // 3. Add a manual job
    await page.click('button:has-text("ADD JOB MANUALLY")');
    await expect(page.locator('h2')).toContainText("Add External Position");
    
    await page.fill('input[placeholder="e.g. Google"]', 'Test Corp');
    await page.fill('input[placeholder="e.g. Senior QA Engineer"]', 'Senior QA Tester');
    await page.fill('textarea[placeholder*="Paste"]', 'Expert in Playwright and AI testing.');
    await page.click('button:has-text("Save & Analyze Job")');

    // After save, modal closes and job appears in AUTO-MATCHED
    await expect(page.locator('.jobItem').filter({ hasText: 'Test Corp' }).first()).toBeVisible({ timeout: 15000 });

    // 4. Save it to pipeline (creates Application with PENDING status, triggers page reload)
    const jobCard = page.locator('.jobItem').filter({ hasText: 'Test Corp' }).first();
    await jobCard.locator('button:has-text("SAVE TO PIPELINE")').click();
    
    // Wait for reload to complete
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // 5. Navigate back to Job Pipeline and switch to SAVED tab
    await page.locator('nav').getByText('Job Pipeline', { exact: true }).click();
    await page.locator('button').filter({ hasText: 'SAVED' }).click();
    await expect(page.locator('main')).toContainText('Test Corp', { timeout: 10000 });

    // 6. Change status to APPLIED
    const savedItem = page.locator('.jobItem').filter({ hasText: 'Test Corp' }).first();
    await savedItem.locator('select').selectOption('APPLIED');
    
    // 7. Verify it in MY APPLICATIONS
    await page.locator('button').filter({ hasText: 'MY APPLICATIONS' }).click();
    await expect(page.locator('main')).toContainText('Test Corp', { timeout: 10000 });
  });
});
