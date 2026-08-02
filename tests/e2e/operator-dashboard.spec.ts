import { test, expect } from '@playwright/test';

test.describe('Operator Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@e2e.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('Should render Live KPIs correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
    // Ensure KPI grid is visible
    const kpiGrid = page.locator('.grid'); // Basic assumption of tailwind grid class
    await expect(kpiGrid).toBeVisible();
  });

  test('Should support visual regression testing for critical dashboard', async ({ page }) => {
    // Take a screenshot and compare it with the baseline
    // The first time this runs, it will create the baseline.
    // Subsequent runs will compare against the baseline.
    await expect(page).toHaveScreenshot('operator-dashboard.png', { maxDiffPixelRatio: 0.1 });
  });
});
