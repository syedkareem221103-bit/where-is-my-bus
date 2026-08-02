import { test, expect } from '@playwright/test';

test.describe('Smoke Test Suite', () => {
  test('Should load the landing/login page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('System Health API should be healthy', async ({ request }) => {
    const response = await request.get('/api/v1/system/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('HEALTHY');
  });
});
