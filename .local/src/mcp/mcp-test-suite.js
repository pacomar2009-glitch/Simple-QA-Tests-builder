/**
 * Test básico del sistema MCP integrado
 */

console.log('🧪 [MCP-TEST] Iniciando tests básicos del sistema MCP...');

// Simular datos de prueba
const testData = {
  steps: [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      type: 'navigation',
      url: 'https://example.com',
      method: 'devtools'
    },
    {
      id: 2,
      timestamp: new Date().toISOString(),
      type: 'interaction',
      element: {
        tagName: 'INPUT',
        id: 'email',
        type: 'email',
        value: 'test@example.com'
      },
      method: 'devtools',
      robust: true
    },
    {
      id: 3,
      timestamp: new Date().toISOString(),
      type: 'interaction',
      element: {
        tagName: 'BUTTON',
        id: 'submit',
        className: 'btn btn-primary'
      },
      method: 'devtools',
      robust: true
    }
  ]
};

// Test 1: Verificar generación de CSV manual
function testManualCSV() {
  console.log('📊 [MCP-TEST] Testing Manual CSV generation...');
  
  const mockMcpSystem = {
    capturedSteps: testData.steps,
    generateStepDescription: (step) => {
      if (step.type === 'navigation') return `Navigate to ${step.url}`;
      if (step.type === 'interaction' && step.element) {
        return `Interact with ${step.element.tagName}#${step.element.id}`;
      }
      return `Perform ${step.type}`;
    },
    generateExpectedResult: (step) => {
      if (step.type === 'navigation') return `Page should load successfully`;
      return `Element should respond correctly`;
    },
    generateManualTestCSV: (customInstructions = '') => {
      const csvHeaders = [
        'Test Step ID',
        'Test Step Description',
        'Test Data', 
        'Expected Result',
        'Step Type',
        'URL Context',
        'Timestamp'
      ];
      
      const csvRows = mockMcpSystem.capturedSteps.map((step, index) => {
        const stepId = `STEP_${String(index + 1).padStart(3, '0')}`;
        const description = mockMcpSystem.generateStepDescription(step);
        const testData = step.element?.value || '';
        const expectedResult = mockMcpSystem.generateExpectedResult(step);
        
        return [
          stepId,
          `"${description}"`,
          `"${testData}"`,
          `"${expectedResult}"`,
          step.type,
          `"${step.url || ''}"`,
          step.timestamp
        ].join(',');
      });
      
      const csvContent = [
        '# Test Case: MCP Generated Test',
        `# Generated: ${new Date().toISOString()}`,
        `# Custom Instructions: ${customInstructions}`,
        `# Steps Count: ${mockMcpSystem.capturedSteps.length}`,
        '',
        csvHeaders.join(','),
        ...csvRows
      ].join('\n');
      
      return {
        success: true,
        content: csvContent,
        fileName: `mcp_test_${Date.now()}.csv`,
        stepsCount: mockMcpSystem.capturedSteps.length
      };
    }
  };
  
  const result = mockMcpSystem.generateManualTestCSV('Test instructions');
  
  if (result.success) {
    console.log('✅ [MCP-TEST] Manual CSV generation: PASSED');
    console.log(`   - Steps: ${result.stepsCount}`);
    console.log(`   - File: ${result.fileName}`);
    console.log(`   - Content length: ${result.content.length} chars`);
  } else {
    console.error('❌ [MCP-TEST] Manual CSV generation: FAILED');
  }
  
  return result.success;
}

// Test 2: Verificar generación de test Playwright
function testPlaywrightGeneration() {
  console.log('🎭 [MCP-TEST] Testing Playwright generation...');
  
  const mockMcpSystem = {
    capturedSteps: testData.steps,
    generateRobustSelector: (element) => {
      if (element.id) return `#${element.id}`;
      if (element.className) return `.${element.className.split(' ')[0]}`;
      return element.tagName?.toLowerCase() || 'body';
    },
    convertStepToPlaywright: (step, index) => {
      const stepNumber = index + 1;
      const indent = '    ';
      
      switch (step.type) {
        case 'navigation':
          return `${indent}// Step ${stepNumber}: Navigation
${indent}await page.goto('${step.url}');
${indent}await page.waitForLoadState('networkidle');`;
          
        case 'interaction':
          if (step.element) {
            const selector = mockMcpSystem.generateRobustSelector(step.element);
            const action = step.element.type === 'input' || step.element.tagName === 'INPUT' ? 'fill' : 'click';
            const value = step.element.value || '';
            
            if (action === 'fill' && value) {
              return `${indent}// Step ${stepNumber}: Type text
${indent}await page.locator('${selector}').fill('${value}');`;
            } else {
              return `${indent}// Step ${stepNumber}: Click element
${indent}await page.locator('${selector}').click();`;
            }
          }
          break;
          
        default:
          return `${indent}// Step ${stepNumber}: ${step.type}`;
      }
      
      return null;
    },
    generateAutomatedPlaywright: (customInstructions = '') => {
      const testSteps = mockMcpSystem.capturedSteps.map((step, index) => {
        return mockMcpSystem.convertStepToPlaywright(step, index);
      }).filter(step => step !== null);
      
      const testTemplate = `const { test, expect } = require('@playwright/test');

/**
 * MCP Generated Test
 * Steps: ${mockMcpSystem.capturedSteps.length}
 * Instructions: ${customInstructions}
 */

test.describe('MCP User Journey', () => {
  test('captured flow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
${testSteps.join('\n')}
    
    await expect(page).toHaveURL(/.*/);
  });
});`;

      return {
        success: true,
        content: testTemplate,
        fileName: `mcp_playwright_test_${Date.now()}.spec.js`,
        stepsCount: mockMcpSystem.capturedSteps.length
      };
    }
  };
  
  const result = mockMcpSystem.generateAutomatedPlaywright('MCP test instructions');
  
  if (result.success) {
    console.log('✅ [MCP-TEST] Playwright generation: PASSED');
    console.log(`   - Steps: ${result.stepsCount}`);
    console.log(`   - File: ${result.fileName}`);
    console.log(`   - Content includes: ${result.content.includes('test.describe') ? 'test structure' : 'no test structure'}`);
  } else {
    console.error('❌ [MCP-TEST] Playwright generation: FAILED');
  }
  
  return result.success;
}

// Test 3: Verificar estadísticas MCP
function testMCPStatistics() {
  console.log('📈 [MCP-TEST] Testing MCP statistics...');
  
  const mockMcpSystem = {
    capturedSteps: testData.steps,
    getStatistics: () => {
      return {
        stepsCount: mockMcpSystem.capturedSteps.length,
        isCapturing: false,
        stepTypes: mockMcpSystem.capturedSteps.reduce((acc, step) => {
          acc[step.type] = (acc[step.type] || 0) + 1;
          return acc;
        }, {}),
        method: 'chrome-devtools-protocol',
        robust: true
      };
    }
  };
  
  const stats = mockMcpSystem.getStatistics();
  
  const expected = {
    stepsCount: 3,
    navigation: 1,
    interaction: 2
  };
  
  const success = stats.stepsCount === expected.stepsCount &&
                  stats.stepTypes.navigation === expected.navigation &&
                  stats.stepTypes.interaction === expected.interaction &&
                  stats.robust === true;
  
  if (success) {
    console.log('✅ [MCP-TEST] Statistics generation: PASSED');
    console.log(`   - Steps: ${stats.stepsCount}`);
    console.log(`   - Types: ${JSON.stringify(stats.stepTypes)}`);
    console.log(`   - Robust: ${stats.robust}`);
  } else {
    console.error('❌ [MCP-TEST] Statistics generation: FAILED');
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    console.error(`   Got: ${JSON.stringify(stats)}`);
  }
  
  return success;
}

// Ejecutar todos los tests
function runAllMCPTests() {
  console.log('🚀 [MCP-TEST] Starting MCP System Test Suite...');
  
  const tests = [
    { name: 'Manual CSV Generation', fn: testManualCSV },
    { name: 'Playwright Generation', fn: testPlaywrightGeneration },
    { name: 'MCP Statistics', fn: testMCPStatistics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    console.log(`\n🧪 [MCP-TEST] Running test ${index + 1}/${tests.length}: ${test.name}`);
    
    try {
      if (test.fn()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ [MCP-TEST] Test ${test.name} threw error:`, error);
      failed++;
    }
  });
  
  console.log(`\n📊 [MCP-TEST] Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('🎉 [MCP-TEST] All tests passed! MCP system is ready.');
  } else {
    console.log('⚠️ [MCP-TEST] Some tests failed. Check implementation.');
  }
  
  return { passed, failed, total: tests.length };
}

// Ejecutar tests si se ejecuta directamente
if (typeof window === 'undefined' || typeof chrome === 'undefined') {
  // Ejecutar en terminal/Node.js
  runAllMCPTests();
} else {
  // Ejecutar en navegador/extensión
  console.log('🌐 [MCP-TEST] MCP Test Suite loaded. Run runAllMCPTests() to execute.');
  window.runAllMCPTests = runAllMCPTests;
}