import { expect } from '@playwright/test';
import { test } from './test-setup';

test('build success.', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page.locator('body')).toBeVisible();
});
