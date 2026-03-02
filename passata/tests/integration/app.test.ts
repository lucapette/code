import {
  test as vitestTest,
  beforeAll,
  afterAll,
  beforeEach,
  describe,
} from 'vitest';
import { expect, chromium, type Browser, type Page } from '@playwright/test';

let browser: Browser;
let page: Page;

const BASE_URL = 'http://localhost:3000';

beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
}, 30000);

afterAll(async () => {
  await browser.close();
});

beforeEach(async () => {
  await page.request.post(`${BASE_URL}/api/test/reset`);
});

describe('Passata App', () => {
  vitestTest('home page loads', async () => {
    await page.goto(BASE_URL);
    await expect(
      page.locator('input[placeholder*="working on"]')
    ).toBeVisible();
  });

  vitestTest('can navigate to tags page', async () => {
    await page.goto(BASE_URL);
    await page.click('a[href="/tags"]');
    await expect(page.locator('input[placeholder*="Add a tag"]')).toBeVisible();
  });

  vitestTest('can navigate to stats page', async () => {
    await page.goto(BASE_URL);
    await page.click('a[href="/stats"]');
    await expect(page.locator('text=Total Pomodoros')).toBeVisible();
  });

  vitestTest('pomodoros list container exists', async () => {
    await page.goto(BASE_URL);
    const list = page.locator('.pomodoro-list');
    await expect(list).toBeAttached();
  });

  vitestTest('tags page shows empty state initially', async () => {
    await page.goto(`${BASE_URL}/tags`);
    const tagItems = page.locator('.tag-item');
    await expect(tagItems).toHaveCount(0);
  });

  vitestTest('can create a new tag', async () => {
    await page.goto(`${BASE_URL}/tags`);
    await page.fill('input[placeholder="Add a tag..."]', 'test-tag');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=test-tag')).toBeVisible();
  });

  vitestTest('can delete a tag', async () => {
    await page.goto(`${BASE_URL}/tags`);
    await page.fill('input[placeholder="Add a tag..."]', 'to-delete');
    await page.click('button[type="submit"]');

    const deleteBtn = page.locator('button.btn-danger').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    await expect(page.locator('text=to-delete')).not.toBeVisible();
  });

  vitestTest('stats page shows zero initially', async () => {
    await page.goto(`${BASE_URL}/stats`);
    await expect(page.locator('.title')).toContainText('Total Pomodoros: 0');
  });

  vitestTest('stats page shows pomodoros from API', async () => {
    await page.request.post(`${BASE_URL}/api/pomodoros`, {
      data: { tag: 'test', duration: 1500 },
    });

    await page.goto(`${BASE_URL}/stats`);
    await expect(page.locator('.title')).toContainText('Total Pomodoros: 1');
  });

  vitestTest('pomodoros list updates after API call', async () => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(100);

    await page.request.post(`${BASE_URL}/api/pomodoros`, {
      data: { tag: 'api-test', duration: 1500 },
    });

    await page.reload();
    await page.waitForTimeout(100);

    const pomodoroCards = page.locator('.card');
    await expect(pomodoroCards).toHaveCount(1);
    await expect(page.locator('.tag').first()).toHaveText('api-test');
  });
});
