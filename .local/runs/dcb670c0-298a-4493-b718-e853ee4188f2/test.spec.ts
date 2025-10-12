import { test, expect, Page, Browser } from '@playwright/test';

// Test generated from MCP data at 2025-10-11T07:11:32.703Z
// Original URL: https://example.com
// Instructions: Generate test for integration verification

test.describe('Test example.com - clicking and filling forms', () => {
  test.setTimeout(30000);
  
  let page;
  let context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    // Start tracing for debugging
    await context.tracing.start({ screenshots: true, snapshots: true });
    // Configure screenshots on failure
    page.on('pageerror', async (error) => {
      console.error('Page error:', error);
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    });

  });

  test.afterEach(async () => {
    // Stop tracing and save
    await context.tracing.stop({ path: 'trace.zip' });
    // Take final screenshot
    await page.screenshot({ path: 'final-screenshot.png', fullPage: true });

    await context.close();
  });

  test('Test example.com - clicking and filling forms', async () => {
    // Step 1: goto
    await page.goto('https://example.com', { 
      waitUntil: 'networkidle',
      timeout: 5000
    });

    // Step 2: Click on element with id "test-button"
    await page.click('#test-button', { 
      timeout: 5000
    });

    // Step 3: Fill element with id "test-input" with "test value"
    await page.fill('#test-input', 'test value', {
      timeout: 5000
    });
    await page.fill('#test-input', '');

    // Assertions
    // Assertion 1: Button should be visible and clickable
    await expect(page.locator('#test-button')).toBeVisible();

    // Assertion 2: Input field should contain the entered value
    await expect(page.locator('#test-input')).toHaveValue('test value');
  });
});