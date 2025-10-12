/**
 * Enhanced MCP Test Suite - Validación de Optimización
 * Verifica que el sistema integrado funcione sin ineficiencias
 */

// Importar componentes del sistema Enhanced MCP
import { enhancedChromeDevToolsMCP } from '../src/mcp/enhanced-chrome-devtools-mcp.js';
import { enhancedPlaywrightMCP } from '../src/mcp/enhanced-playwright-mcp.js';
import { mcpCoordinator } from '../src/mcp/mcp-coordinator.js';

// Test de datos de ejemplo con ineficiencias típicas
const sampleStepsWithInefficiencies = [
  {
    id: 1,
    timestamp: 1704067200000,
    type: 'click',
    selector: 'input[type="text"]',
    value: '',
    url: 'https://example.com'
  },
  {
    id: 2,
    timestamp: 1704067201000,
    type: 'input',
    selector: 'input[type="text"]',
    value: 'Te',
    url: 'https://example.com'
  },
  {
    id: 3,
    timestamp: 1704067202000,
    type: 'input',
    selector: 'input[type="text"]',
    value: 'Test',
    url: 'https://example.com'
  },
  {
    id: 4,
    timestamp: 1704067203000,
    type: 'input',
    selector: 'input[type="text"]',
    value: 'Test C',
    url: 'https://example.com'
  },
  {
    id: 5,
    timestamp: 1704067204000,
    type: 'input',
    selector: 'input[type="text"]',
    value: 'Test Company',
    url: 'https://example.com'
  },
  {
    id: 6,
    timestamp: 1704067205000,
    type: 'click',
    selector: 'button[type="submit"]',
    value: '',
    url: 'https://example.com'
  },
  {
    id: 7,
    timestamp: 1704067206000,
    type: 'click',
    selector: 'button[type="submit"]',
    value: '',
    url: 'https://example.com'
  }
];

/**
 * Suite de Tests Enhanced MCP
 */
class EnhancedMCPTestSuite {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      details: []
    };
  }

  /**
   * Ejecutar todos los tests
   */
  async runAllTests() {
    console.log('🧪 Enhanced MCP Test Suite - Starting Validation');
    console.log('=' .repeat(60));

    await this.testStepConsolidation();
    await this.testIntentDetection();
    await this.testPlaywrightGeneration();
    await this.testIntegrationFlow();
    await this.testOptimizationMetrics();
    
    this.printResults();
    return this.results;
  }

  /**
   * Test 1: Consolidación de pasos
   */
  async testStepConsolidation() {
    this.addTest('Step Consolidation');
    
    try {
      const result = await enhancedChromeDevToolsMCP.processStepsWithIntelligence(sampleStepsWithInefficiencies);
      
      // Verificaciones
      this.assert(result.success, 'Processing should succeed');
      this.assert(result.optimizedSteps.length < sampleStepsWithInefficiencies.length, 'Steps should be consolidated');
      this.assert(result.optimization.reductionPercent > 0, 'Should show reduction percentage');
      
      // Verificar que los inputs progresivos se consolidaron
      const finalInputStep = result.optimizedSteps.find(step => step.intent === 'text_input');
      this.assert(finalInputStep && finalInputStep.value === 'Test Company', 'Should consolidate progressive inputs');
      
      // Verificar que los clicks duplicados se eliminaron
      const clickSteps = result.optimizedSteps.filter(step => step.intent === 'button_click');
      this.assert(clickSteps.length === 1, 'Should eliminate duplicate clicks');
      
      console.log(`✅ Consolidation: ${sampleStepsWithInefficiencies.length} → ${result.optimizedSteps.length} steps`);
      this.passTest();
    } catch (error) {
      this.failTest(`Step consolidation failed: ${error.message}`);
    }
  }

  /**
   * Test 2: Detección de intenciones
   */
  async testIntentDetection() {
    this.addTest('Intent Detection');
    
    try {
      const result = await enhancedChromeDevToolsMCP.processStepsWithIntelligence(sampleStepsWithInefficiencies);
      
      // Verificar que se detectaron patrones
      this.assert(result.patterns.length > 0, 'Should detect user patterns');
      
      // Verificar intenciones específicas en los pasos
      const hasTextInput = result.optimizedSteps.some(step => step.intent === 'text_input');
      const hasButtonClick = result.optimizedSteps.some(step => step.intent === 'button_click');
      
      this.assert(hasTextInput, 'Should detect text input intent');
      this.assert(hasButtonClick, 'Should detect button click intent');
      
      console.log(`✅ Intent Detection: ${result.patterns.length} patterns detected`);
      this.passTest();
    } catch (error) {
      this.failTest(`Intent detection failed: ${error.message}`);
    }
  }

  /**
   * Test 3: Generación de Playwright optimizada
   */
  async testPlaywrightGeneration() {
    this.addTest('Playwright Generation');
    
    try {
      // Primero optimizar los pasos
      const optimizedResult = await enhancedChromeDevToolsMCP.processStepsWithIntelligence(sampleStepsWithInefficiencies);
      
      // Cargar en Enhanced Playwright MCP
      const loadResult = enhancedPlaywrightMCP.loadOptimizedSteps({
        format: 'enhanced-mcp-v1',
        steps: optimizedResult.optimizedSteps,
        patterns: optimizedResult.patterns,
        optimization: optimizedResult.optimization
      });
      
      this.assert(loadResult.success, 'Should load optimized steps');
      
      // Generar test Playwright
      const testResult = enhancedPlaywrightMCP.generateOptimizedPlaywrightTest('Test generation validation');
      
      this.assert(testResult.success, 'Should generate Playwright test');
      this.assert(testResult.content.includes('const { test, expect }'), 'Should have proper Playwright imports');
      this.assert(testResult.content.includes('test.describe'), 'Should have test structure');
      this.assert(testResult.content.includes('expect('), 'Should have assertions');
      this.assert(!testResult.content.includes('waitForTimeout(5000)'), 'Should not have static long waits');
      
      // Validar el test generado
      const validation = enhancedPlaywrightMCP.validateGeneratedTest(testResult.content);
      this.assert(validation.valid, `Generated test should be valid: ${validation.recommendations.join(', ')}`);
      
      console.log(`✅ Playwright Generation: ${testResult.stepsCount} optimized steps`);
      this.passTest();
    } catch (error) {
      this.failTest(`Playwright generation failed: ${error.message}`);
    }
  }

  /**
   * Test 4: Flujo de integración completo
   */
  async testIntegrationFlow() {
    this.addTest('Integration Flow');
    
    try {
      // Simular el flujo completo desde el coordinador
      const coordinator = mcpCoordinator;
      
      // Cargar datos de prueba
      coordinator.capturedData = {
        format: 'mcp-v1',
        steps: sampleStepsWithInefficiencies,
        timestamp: Date.now()
      };
      
      // Generar test optimizado
      const result = await coordinator.generateOptimizedPlaywrightTest('Integration test');
      
      this.assert(result.success, 'Integration flow should succeed');
      this.assert(result.format === 'enhanced-playwright', 'Should use enhanced format');
      this.assert(result.optimization, 'Should include optimization data');
      this.assert(result.validation, 'Should include validation results');
      
      console.log(`✅ Integration Flow: ${result.optimization.efficiencyGain}% efficiency gain`);
      this.passTest();
    } catch (error) {
      this.failTest(`Integration flow failed: ${error.message}`);
    }
  }

  /**
   * Test 5: Métricas de optimización
   */
  async testOptimizationMetrics() {
    this.addTest('Optimization Metrics');
    
    try {
      const result = await enhancedChromeDevToolsMCP.processStepsWithIntelligence(sampleStepsWithInefficiencies);
      
      // Verificar métricas
      this.assert(result.optimization.reductionPercent >= 20, 'Should have significant reduction (>=20%)');
      this.assert(result.optimization.consolidatedActions > 0, 'Should consolidate actions');
      this.assert(result.optimization.removedDuplicates > 0, 'Should remove duplicates');
      
      // Verificar eficiencias específicas
      const inputSteps = result.optimizedSteps.filter(step => step.intent === 'text_input');
      this.assert(inputSteps.length === 1, 'Should consolidate progressive inputs to single step');
      
      const clickSteps = result.optimizedSteps.filter(step => step.intent === 'button_click');
      this.assert(clickSteps.length === 1, 'Should consolidate duplicate clicks to single step');
      
      console.log(`✅ Optimization Metrics: ${result.optimization.reductionPercent}% reduction achieved`);
      this.passTest();
    } catch (error) {
      this.failTest(`Optimization metrics failed: ${error.message}`);
    }
  }

  /**
   * Utilidades de testing
   */
  addTest(name) {
    this.results.totalTests++;
    this.currentTest = name;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  passTest() {
    this.results.passedTests++;
    this.results.details.push({
      test: this.currentTest,
      status: 'PASS',
      message: 'Test passed successfully'
    });
  }

  failTest(message) {
    this.results.failedTests++;
    this.results.details.push({
      test: this.currentTest,
      status: 'FAIL',
      message: message
    });
    console.error(`❌ ${this.currentTest}: ${message}`);
  }

  printResults() {
    console.log('\n' + '=' .repeat(60));
    console.log('🧪 Enhanced MCP Test Results');
    console.log('=' .repeat(60));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passedTests} ✅`);
    console.log(`Failed: ${this.results.failedTests} ❌`);
    console.log(`Success Rate: ${Math.round((this.results.passedTests / this.results.totalTests) * 100)}%`);
    
    if (this.results.details.length > 0) {
      console.log('\nDetailed Results:');
      this.results.details.forEach(detail => {
        const icon = detail.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${detail.test}: ${detail.message}`);
      });
    }
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 All Enhanced MCP tests passed! The system is ready for production.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }
  }
}

// Exportar para uso en testing
export { EnhancedMCPTestSuite, sampleStepsWithInefficiencies };

// Auto-ejecutar si se ejecuta directamente
if (typeof window !== 'undefined' && window.location) {
  // Ejecutar en browser/extension context
  const testSuite = new EnhancedMCPTestSuite();
  testSuite.runAllTests().then(results => {
    console.log('Enhanced MCP Test Suite completed:', results);
  });
}