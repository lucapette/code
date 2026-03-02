import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('Passata App', () => {
  test('home page loads', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(
      page.locator('input[placeholder*="working on"]')
    ).toBeVisible();
  });

  test('can navigate to tags page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('a[href="/tags"]');
    await expect(page.locator('input[placeholder*="Add a tag"]')).toBeVisible();
  });

  test('can navigate to stats page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('a[href="/stats"]');
    await expect(page.locator('text=Total Pomodoros')).toBeVisible();
  });

  test('pomodoros list container exists', async ({ page }) => {
    await page.goto(BASE_URL);
    const list = page.locator('.pomodoro-list');
    await expect(list).toBeAttached();
  });
});
