/**
 * MCP to Playwright Generator - Converts MCP format to Playwright test code
 * 
 * Input: MCP JSON format
 * Output: Executable Playwright test files
 */

import { test, expect } from '@playwright/test';

/**
 * Generates Playwright test code from MCP data
 * @param {Object} mcpData - MCP formatted test data
 * @param {Object} options - Generation options
 * @returns {string} Playwright test code
 */
export function generatePlaywrightTest(mcpData, options = {}) {
  const {
    useTypeScript = false,
    includeTrace = true,
    includeScreenshots = true,
    timeout = 30000
  } = options;
  
  const imports = generateImports(useTypeScript);
  const testConfig = generateTestConfig(mcpData, timeout);
  const testBody = generateTestBody(mcpData, { includeTrace, includeScreenshots });
  
  return `${imports}\n\n${testConfig}\n\n${testBody}`;
}

/**
 * Generates import statements
 */
function generateImports(useTypeScript) {
  const extension = useTypeScript ? '.ts' : '.js';
  return `import { test, expect, Page, Browser } from '@playwright/test';`;
}

/**
 * Generates test configuration
 */
function generateTestConfig(mcpData, timeout) {
  return `// Test generated from MCP data at ${mcpData.metadata?.generatedAt || new Date().toISOString()}
// Original URL: ${mcpData.url}
// Instructions: ${mcpData.instructions || 'None'}

test.describe('${mcpData.testTitle}', () => {
  test.setTimeout(${timeout});
  
  let page;
  let context;`;
}

/**
 * Generates the main test body
 */
function generateTestBody(mcpData, options) {
  const setupCode = generateSetup(options);
  const stepCode = generateSteps(mcpData.steps);
  const assertionCode = generateAssertions(mcpData.assertions);
  const teardownCode = generateTeardown(options);
  
  return `  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
${setupCode}
  });

  test.afterEach(async () => {
${teardownCode}
    await context.close();
  });

  test('${mcpData.testTitle}', async () => {
${stepCode}
${assertionCode}
  });
});`;
}

/**
 * Generates setup code for tracing and screenshots
 */
function generateSetup(options) {
  let setup = '';
  
  if (options.includeTrace) {
    setup += `    // Start tracing for debugging
    await context.tracing.start({ screenshots: true, snapshots: true });\n`;
  }
  
  if (options.includeScreenshots) {
    setup += `    // Configure screenshots on failure
    page.on('pageerror', async (error) => {
      console.error('Page error:', error);
      await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    });\n`;
  }
  
  return setup;
}

/**
 * Generates step execution code
 */
function generateSteps(steps) {
  if (!steps || steps.length === 0) {
    return '    // No steps to execute';
  }
  
  return steps.map((step, index) => {
    const comment = `    // Step ${index + 1}: ${step.options?.description || step.action}`;
    const code = generateStepCode(step);
    return `${comment}\n${code}`;
  }).join('\n\n');
}

/**
 * Generates code for a single step
 */
function generateStepCode(step) {
  const { action, selector, value, options = {} } = step;
  const timeout = options.timeout || 5000;
  
  switch (action) {
    case 'goto':
      return `    await page.goto('${value}', { 
      waitUntil: '${options.waitUntil || 'networkidle'}',
      timeout: ${timeout}
    });`;
    
    case 'click':
      return `    await page.click('${selector}', { 
      timeout: ${timeout}
    });`;
    
    case 'fill':
      return `    await page.fill('${selector}', '${escapeString(value)}', {
      timeout: ${timeout}
    });${options.clear ? '\n    await page.fill(\'' + selector + '\', \'\');' : ''}`;
    
    case 'press':
      return `    await page.press('${selector}', '${value}', {
      timeout: ${timeout}
    });`;
    
    case 'waitFor':
      return generateWaitForCode(step);
    
    case 'assert':
      return generateAssertCode(step);
    
    default:
      return `    // Unknown action: ${action}
    console.warn('Skipping unknown action: ${action}');`;
  }
}

/**
 * Generates waitFor code based on wait type
 */
function generateWaitForCode(step) {
  const { selector, value, options = {} } = step;
  const timeout = options.timeout || 5000;
  
  if (options.waitType === 'visible') {
    return `    await page.waitForSelector('${selector}', { 
      state: 'visible',
      timeout: ${timeout}
    });`;
  }
  
  if (options.waitType === 'hidden') {
    return `    await page.waitForSelector('${selector}', { 
      state: 'hidden',
      timeout: ${timeout}
    });`;
  }
  
  if (options.waitType === 'networkidle') {
    return `    await page.waitForLoadState('networkidle', {
      timeout: ${timeout}
    });`;
  }
  
  return `    await page.waitForTimeout(${value || 1000});`;
}

/**
 * Generates assertion code
 */
function generateAssertions(assertions) {
  if (!assertions || assertions.length === 0) {
    return '    // No specific assertions defined';
  }
  
  const assertionCode = assertions.map((assertion, index) => {
    const comment = `    // Assertion ${index + 1}: ${assertion.description || assertion.type}`;
    const code = generateAssertCode(assertion);
    return `${comment}\n${code}`;
  }).join('\n\n');
  
  return `\n    // Assertions\n${assertionCode}`;
}

/**
 * Generates code for a single assertion
 */
function generateAssertCode(assertion) {
  const { type, selector, expected, options = {} } = assertion;
  
  switch (type) {
    case 'visible':
      return `    await expect(page.locator('${selector}')).toBeVisible();`;
    
    case 'hidden':
      return `    await expect(page.locator('${selector}')).toBeHidden();`;
    
    case 'text':
      return `    await expect(page.locator('${selector}')).toHaveText('${escapeString(expected)}');`;
    
    case 'value':
      return `    await expect(page.locator('${selector}')).toHaveValue('${escapeString(expected)}');`;
    
    case 'count':
      return `    await expect(page.locator('${selector}')).toHaveCount(${expected});`;
    
    case 'urlIncludes':
      return `    await expect(page).toHaveURL(/${escapeRegex(expected)}/);`;
    
    case 'titleContains':
      return `    await expect(page).toHaveTitle(/${escapeRegex(expected)}/);`;
    
    case 'textContent':
      return `    const element = page.locator('${selector}');
    await expect(element).toContainText('${escapeString(expected)}');`;
    
    case 'attribute':
      const attributeName = options.attribute || 'class';
      return `    await expect(page.locator('${selector}')).toHaveAttribute('${attributeName}', '${escapeString(expected)}');`;
    
    case 'enabled':
      return expected 
        ? `    await expect(page.locator('${selector}')).toBeEnabled();`
        : `    await expect(page.locator('${selector}')).toBeDisabled();`;
    
    case 'checked':
      return expected
        ? `    await expect(page.locator('${selector}')).toBeChecked();`
        : `    await expect(page.locator('${selector}')).not.toBeChecked();`;
    
    default:
      return `    // Unknown assertion type: ${type}
    console.warn('Skipping unknown assertion: ${type}');`;
  }
}

/**
 * Generates teardown code
 */
function generateTeardown(options) {
  let teardown = '';
  
  if (options.includeTrace) {
    teardown += `    // Stop tracing and save
    await context.tracing.stop({ path: 'trace.zip' });\n`;
  }
  
  if (options.includeScreenshots) {
    teardown += `    // Take final screenshot
    await page.screenshot({ path: 'final-screenshot.png', fullPage: true });\n`;
  }
  
  return teardown;
}

/**
 * Escapes strings for JavaScript code generation
 */
function escapeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Escapes strings for regex patterns
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generates Playwright configuration file
 */
export function generatePlaywrightConfig(options = {}) {
  const {
    baseURL = '',
    browsers = ['chromium'],
    headless = false,
    workers = 1,
    timeout = 30000
  } = options;
  
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: ${workers},
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['line']
  ],
  timeout: ${timeout},
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: '${baseURL}',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: ${headless},
  },
  projects: [
${browsers.map(browser => `    {
      name: '${browser}',
      use: { ...devices['Desktop ${browser.charAt(0).toUpperCase() + browser.slice(1)}'] },
    },`).join('\n')}
  ],
  webServer: process.env.LOCAL_SERVER ? {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  } : undefined,
});`;
}

/**
 * Generates package.json scripts for Playwright
 */
export function generatePlaywrightScripts() {
  return {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report",
    "test:install": "playwright install"
  };
}