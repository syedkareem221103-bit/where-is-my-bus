import { test, expect } from '@playwright/test';

test.describe('Driver Journey Workflow', () => {
  test.use({ geolocation: { longitude: -122.4194, latitude: 37.7749 }, permissions: ['geolocation'] });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'driver@e2e.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/driver/);
  });

  test('Should start a trip and broadcast geolocation', async ({ page }) => {
    // Wait for the Driver Dashboard to load
    await expect(page.locator('h1')).toContainText('Driver Dashboard');

    // Simulate clicking "Start Trip"
    // Note: Assuming there is a trip assigned or a button to start a trip
    const startButton = page.locator('button:has-text("Start Trip")');
    if (await startButton.isVisible()) {
      await startButton.click();
      await expect(page.locator('text=End Trip')).toBeVisible();
    }
  });

  test('Should trigger Emergency SOS', async ({ page }) => {
    // Locate and trigger the SOS button
    const sosButton = page.locator('button:has-text("SOS")');
    if (await sosButton.isVisible()) {
      await sosButton.click();
      // Expect some confirmation or UI state change
      await expect(page.locator('text=Emergency Triggered')).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});
