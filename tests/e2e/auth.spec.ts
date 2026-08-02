import { test, expect } from '@playwright/test';

test.describe('Authentication & Authorization Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Should render the login page correctly', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Sign in to your account');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('Should fail gracefully with invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'badpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.text-red-500')).toBeVisible();
    await expect(page.locator('.text-red-500')).toContainText('Invalid email or password');
  });

  test('Should login successfully as ORG_ADMIN and redirect', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@e2e.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('Should prevent unauthenticated access to protected routes', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
