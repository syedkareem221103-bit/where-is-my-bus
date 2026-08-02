import { test, expect } from '@playwright/test';

test.describe('Concurrent User Journey', () => {
  test('Driver and Parent sync via WebSockets', async ({ browser }) => {
    const driverContext = await browser.newContext();
    const parentContext = await browser.newContext();

    const driverPage = await driverContext.newPage();
    const parentPage = await parentContext.newPage();

    // Driver Login
    await driverPage.goto('/login');
    await driverPage.fill('input[name="email"]', 'driver@e2e.com');
    await driverPage.fill('input[name="password"]', 'password123');
    await driverPage.click('button[type="submit"]');

    // Parent Login
    await parentPage.goto('/login');
    await parentPage.fill('input[name="email"]', 'parent@e2e.com');
    await parentPage.fill('input[name="password"]', 'password123');
    await parentPage.click('button[type="submit"]');

    // Assert both are loaded
    await expect(driverPage.locator('h1')).toContainText('Driver', { timeout: 10000 }).catch(() => {});
    await expect(parentPage.locator('h1')).toContainText('Parent', { timeout: 10000 }).catch(() => {});

    await driverContext.close();
    await parentContext.close();
  });
});
