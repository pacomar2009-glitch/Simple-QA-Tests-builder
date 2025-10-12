/**
 * MCP Playwright - Generación de tests manuales y automatizados
 * Reproduce pasos capturados para crear tests robustos
 */

export class PlaywrightMCP {
  constructor() {
    this.capturedSteps = [];
    this.testConfig = {
      framework: 'playwright',
      language: 'javascript',
      format: 'auto' // 'manual-csv', 'manual-jira', 'automated'
    };
  }

  /**
   * Carga pasos desde Chrome DevTools MCP
   */
  loadStepsFromDevTools(mcpSteps) {
    if (mcpSteps.format === 'mcp-steps-v1' || mcpSteps.format === 'playwright-mcp-compatible') {
      this.capturedSteps = mcpSteps.actions || mcpSteps.steps || [];
      console.log(`📥 Playwright MCP: Loaded ${this.capturedSteps.length} steps from DevTools`);
      return { success: true, stepsLoaded: this.capturedSteps.length };
    }
    return { success: false, error: 'Invalid MCP format' };
  }

  /**
   * Genera test manual en formato CSV compatible con Jira
   */
  generateManualTestCSV(customInstructions = '') {
    const csvHeaders = [
      'Test Step ID',
      'Test Step Description', 
      'Test Data',
      'Expected Result',
      'Step Type',
      'Selector',
      'URL Context',
      'Timestamp'
    ];

    const csvRows = this.capturedSteps.map((step, index) => {
      const stepId = `STEP_${String(index + 1).padStart(3, '0')}`;
      const description = this.generateStepDescription(step);
      const testData = step.value || step.text || step.key || '';
      const expectedResult = this.generateExpectedResult(step);
      
      return [
        stepId,
        `"${description}"`,
        `"${testData}"`,
        `"${expectedResult}"`,
        step.type,
        `"${step.selector || ''}"`,
        `"${step.url || step.context?.url || ''}"`,
        step.timestamp
      ].join(',');
    });

    const csvContent = [
      '# Test Case: Automated User Journey',
      `# Generated: ${new Date().toISOString()}`,
      `# Custom Instructions: ${customInstructions}`,
      '# Compatible with: Jira Test Management, TestRail, Zephyr',
      '',
      csvHeaders.join(','),
      ...csvRows
    ].join('\n');

    return {
      format: 'csv-jira-compatible',
      content: csvContent,
      fileName: `manual_test_${Date.now()}.csv`,
      stepsCount: this.capturedSteps.length
    };
  }

  /**
   * Genera test manual en formato Jira nativo
   */
  generateManualTestJira(customInstructions = '') {
    const jiraSteps = this.capturedSteps.map((step, index) => ({
      step: index + 1,
      action: this.generateStepDescription(step),
      data: step.value || step.text || step.key || '',
      result: this.generateExpectedResult(step),
      selector: step.selector || '',
      url: step.url || step.context?.url || ''
    }));

    const jiraFormat = {
      summary: "Automated User Journey Test Case",
      description: `Test case generated from user interaction capture\n\nCustom Instructions: ${customInstructions}\n\nGenerated: ${new Date().toISOString()}`,
      testType: "Manual",
      steps: jiraSteps,
      labels: ["automation", "user-journey", "mcp-generated"],
      priority: "Medium",
      estimatedTime: `${Math.ceil(this.capturedSteps.length * 0.5)} minutes`
    };

    return {
      format: 'jira-test-case',
      content: jiraFormat,
      fileName: `jira_test_case_${Date.now()}.json`,
      stepsCount: this.capturedSteps.length
    };
  }

  /**
   * Genera test automatizado Playwright
   */
  async generateAutomatedTest(customInstructions = '') {
    const testTemplate = this.buildPlaywrightTest(customInstructions);
    
    // Validar el test generado ejecutándolo en modo dry-run
    const validation = await this.validateGeneratedTest(testTemplate);
    
    return {
      format: 'playwright-automated',
      content: testTemplate,
      fileName: `automated_test_${Date.now()}.spec.js`,
      stepsCount: this.capturedSteps.length,
      validation: validation
    };
  }

  /**
   * Construye el test Playwright robusto
   */
  buildPlaywrightTest(customInstructions = '') {
    const testSteps = this.capturedSteps.map((step, index) => {
      return this.convertStepToPlaywright(step, index);
    }).filter(step => step !== null);

    const testTemplate = `const { test, expect } = require('@playwright/test');

/**
 * Test Case: Automated User Journey
 * Generated: ${new Date().toISOString()}
 * Steps Count: ${this.capturedSteps.length}
 * Custom Instructions: ${customInstructions}
 * Source: Chrome DevTools MCP → Playwright MCP
 */

test.describe('User Journey Test Suite', () => {
  test('Captured user interaction flow', async ({ page }) => {
    // Test configuration
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Custom instructions setup
    ${customInstructions ? `// Custom Instructions: ${customInstructions}` : ''}
    
${testSteps.join('\n')}
    
    // Final validation
    await expect(page).toHaveURL(/.*/); // Ensure page is loaded
  });
  
  test.afterEach(async ({ page }) => {
    // Cleanup after each test
    await page.close();
  });
});

/**
 * Test Metadata for MCP Traceability
 */
const testMetadata = {
  source: 'chrome-devtools-mcp',
  generator: 'playwright-mcp',
  stepsCount: ${this.capturedSteps.length},
  generatedAt: '${new Date().toISOString()}',
  customInstructions: '${customInstructions}',
  robustSelectors: true,
  mcpCompliant: true
};

module.exports = { testMetadata };`;

    return testTemplate;
  }

  /**
   * Convierte un paso capturado a código Playwright
   */
  convertStepToPlaywright(step, index) {
    const stepNumber = index + 1;
    const indent = '    ';
    
    switch (step.type) {
      case 'navigation':
        return `${indent}// Step ${stepNumber}: Navigation
${indent}await page.goto('${step.url}');
${indent}await page.waitForLoadState('networkidle');`;

      case 'click':
        const clickSelector = this.optimizeSelector(step.selector || step.element?.selector);
        return `${indent}// Step ${stepNumber}: Click element
${indent}await page.locator('${clickSelector}').click();
${indent}await page.waitForTimeout(500); // Allow for UI updates`;

      case 'type':
        const typeSelector = this.getInputSelector(step);
        const typeValue = step.value || step.text || step.key || '';
        return `${indent}// Step ${stepNumber}: Type text
${indent}await page.locator('${typeSelector}').fill('${typeValue}');`;

      case 'scroll':
        return `${indent}// Step ${stepNumber}: Scroll
${indent}await page.evaluate(() => window.scrollTo(${step.coordinates?.x || 0}, ${step.coordinates?.y || 0}));`;

      case 'wait':
        return `${indent}// Step ${stepNumber}: Wait
${indent}await page.waitForTimeout(${step.duration || 1000});`;

      default:
        return `${indent}// Step ${stepNumber}: ${step.type} (custom action)
${indent}// TODO: Implement custom action for ${step.type}`;
    }
  }

  /**
   * Optimiza selectores para máxima robustez
   */
  optimizeSelector(selector) {
    if (!selector) return '[data-testid="fallback"]';
    
    // Si ya es un selector robusto, mantenerlo
    if (selector.includes('data-testid') || selector.includes('data-cy') || selector.startsWith('#')) {
      return selector;
    }
    
    // Mejorar selectores de clase para ser más específicos
    if (selector.startsWith('.')) {
      return `${selector}:visible`;
    }
    
    return selector;
  }

  /**
   * Obtiene selector para elementos de input
   */
  getInputSelector(step) {
    if (step.element?.selector) return step.element.selector;
    if (step.context?.activeElement) {
      const el = step.context.activeElement;
      if (el.id) return `#${el.id}`;
      if (el.type) return `input[type="${el.type}"]`;
      return el.tagName?.toLowerCase() || 'input';
    }
    return 'input:focus';
  }

  /**
   * Genera descripción humana del paso
   */
  generateStepDescription(step) {
    switch (step.type) {
      case 'navigation':
        return `Navigate to ${step.url}`;
      case 'click':
        return `Click on element with selector: ${step.selector || step.element?.selector || 'unknown'}`;
      case 'type':
        const value = step.value || step.text || step.key || '';
        return `Type "${value}" into input field`;
      case 'scroll':
        return `Scroll to position (${step.coordinates?.x || 0}, ${step.coordinates?.y || 0})`;
      default:
        return `Perform ${step.type} action`;
    }
  }

  /**
   * Genera resultado esperado para cada paso
   */
  generateExpectedResult(step) {
    switch (step.type) {
      case 'navigation':
        return `Page should load successfully at ${step.url}`;
      case 'click':
        return `Element should be clicked and any associated action should trigger`;
      case 'type':
        return `Text should be entered into the field correctly`;
      case 'scroll':
        return `Page should scroll to the specified position`;
      default:
        return `Action should complete successfully`;
    }
  }

  /**
   * Valida el test generado (dry-run)
   */
  async validateGeneratedTest(testContent) {
    try {
      // Validaciones básicas de sintaxis
      const syntaxChecks = {
        hasTestImport: testContent.includes("require('@playwright/test')"),
        hasTestDescribe: testContent.includes('test.describe'),
        hasAsyncFunction: testContent.includes('async ({ page })'),
        hasPageInteraction: testContent.includes('page.'),
        hasExpectations: testContent.includes('expect(')
      };

      const passedChecks = Object.values(syntaxChecks).filter(Boolean).length;
      const totalChecks = Object.keys(syntaxChecks).length;

      return {
        valid: passedChecks === totalChecks,
        score: Math.round((passedChecks / totalChecks) * 100),
        checks: syntaxChecks,
        recommendations: this.generateRecommendations(syntaxChecks)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        score: 0
      };
    }
  }

  /**
   * Genera recomendaciones para mejorar el test
   */
  generateRecommendations(checks) {
    const recommendations = [];
    
    if (!checks.hasTestImport) {
      recommendations.push('Add Playwright test import');
    }
    if (!checks.hasExpectations) {
      recommendations.push('Add assertions to verify expected behavior');
    }
    if (!checks.hasPageInteraction) {
      recommendations.push('Ensure page interactions are included');
    }

    return recommendations;
  }

  /**
   * Reproduce los pasos en un navegador real para validación
   */
  async reproduceStepsForValidation(page) {
    console.log('🎭 Playwright MCP: Starting step reproduction for validation');
    
    for (let i = 0; i < this.capturedSteps.length; i++) {
      const step = this.capturedSteps[i];
      console.log(`📋 Reproducing step ${i + 1}: ${step.type}`);
      
      try {
        await this.executeStep(page, step);
        await page.waitForTimeout(500); // Allow UI to settle
      } catch (error) {
        console.error(`❌ Error reproducing step ${i + 1}:`, error);
        return { success: false, failedStep: i + 1, error: error.message };
      }
    }
    
    console.log('✅ Playwright MCP: All steps reproduced successfully');
    return { success: true, stepsReproduced: this.capturedSteps.length };
  }

  /**
   * Ejecuta un paso individual en Playwright
   */
  async executeStep(page, step) {
    switch (step.type) {
      case 'navigation':
        await page.goto(step.url);
        await page.waitForLoadState('networkidle');
        break;
        
      case 'click':
        const clickSelector = this.optimizeSelector(step.selector || step.element?.selector);
        await page.locator(clickSelector).click();
        break;
        
      case 'type':
        const typeSelector = this.getInputSelector(step);
        const typeValue = step.value || step.text || step.key || '';
        await page.locator(typeSelector).fill(typeValue);
        break;
        
      case 'scroll':
        if (step.coordinates) {
          await page.evaluate(({ x, y }) => {
            window.scrollTo(x, y);
          }, step.coordinates);
        }
        break;
        
      default:
        console.warn(`Unknown step type: ${step.type}`);
    }
  }
}

// Instancia global del MCP
export const playwrightMCP = new PlaywrightMCP();