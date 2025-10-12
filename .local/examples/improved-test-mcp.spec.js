const { test, expect } = require('@playwright/test');

/**
 * Test Case: Finnovating Platform - Challenge Registration Flow
 * Generated: 2025-10-10T10:00:00Z
 * Capture Method: Chrome DevTools MCP (Robust)
 * Steps Count: 8
 * Custom Instructions: Test registration flow for FinTech challenge
 * Source: Chrome DevTools MCP → Playwright MCP
 */

test.describe('Finnovating Platform Challenge Registration', () => {
  let page;
  
  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setDefaultTimeout(10000);
  });

  test('should complete challenge registration flow successfully', async () => {
    // Step 1: Navigate to challenge page (MCP)
    await page.goto(process.env.BASE_URL || 'https://platform.finnovating.com/es/challenges/detail/iawards-mexico-by-finnovating-2');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/iawards.*mexico/i);

    // Step 2: Start registration process (MCP)
    const registerButton = page.locator('[data-testid="register-button"], .Button_button__qL0lM').first();
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    
    // Wait for form to appear
    await expect(page.locator('[data-testid="registration-form"], .registration-form')).toBeVisible();

    // Step 3: Open company selection dropdown (MCP)
    const companyDropdown = page.locator('[data-testid="company-select"], .CustomSelect_placeholder__Xdak4');
    await expect(companyDropdown).toBeVisible();
    await companyDropdown.click();
    
    // Wait for dropdown options to load
    await page.waitForLoadState('networkidle');

    // Step 4: Search and select company (MCP - optimized)
    const companyInput = page.locator('#react-select-companyName-input');
    await expect(companyInput).toBeVisible();
    await companyInput.fill('mexp');  // Direct fill instead of progressive typing
    
    // Wait for search results
    await page.waitForFunction(() => {
      const results = document.querySelectorAll('[id*="react-select-companyName-option"]');
      return results.length > 0;
    }, { timeout: 5000 });
    
    // Select first matching option
    const firstOption = page.locator('[id*="react-select-companyName-option"]').first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();

    // Step 5: Fill website information (MCP)
    const websiteInput = page.locator('[data-testid="website-input"], .Input_input__mQgpc');
    await expect(websiteInput).toBeVisible();
    await websiteInput.fill('www.marca-express.es');
    
    // Validate input was filled
    await expect(websiteInput).toHaveValue('www.marca-express.es');

    // Step 6: Accept terms and conditions (MCP)
    const termsCheckbox = page.locator('[data-testid="terms-checkbox"], input[type="checkbox"]').first();
    await expect(termsCheckbox).toBeVisible();
    await termsCheckbox.check();
    await expect(termsCheckbox).toBeChecked();

    // Step 7: Submit registration (MCP)
    const submitButton = page.locator('[data-testid="submit-button"], button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Step 8: Verify successful registration (MCP)
    // Wait for success message or redirect
    await expect(
      page.locator('[data-testid="success-message"], .success-notification')
        .or(page.locator('text=/registration.*successful/i'))
    ).toBeVisible({ timeout: 10000 });
    
    // Alternative: Check for URL change indicating success
    await expect(page).toHaveURL(/.*success.*|.*confirmation.*/);
    
    console.log('✅ MCP Test completed successfully');
  });
  
  test.afterEach(async () => {
    await page.close();
  });
});

// MCP Test Metadata for traceability
const mcpMetadata = {
  generator: 'Chrome DevTools MCP',
  captureMethod: 'devtools-protocol',
  stepsCount: 8,
  generatedAt: '2025-10-10T10:00:00Z',
  customInstructions: 'Test registration flow for FinTech challenge',
  robust: true,
  selectors: 'data-testid prioritized',
  assertions: 'comprehensive',
  performance: 'optimized'
};

module.exports = { mcpMetadata };