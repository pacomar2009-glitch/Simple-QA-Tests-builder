import { test, expect } from '@playwright/test';

test('Generated Test Case', async ({ page }) => {
  await page.locator('button').first().click();
  
  // Add assertions as needed
  await expect(page).toHaveURL(/.*login.*/);
});