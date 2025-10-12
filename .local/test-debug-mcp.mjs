// Test de validación del Enhanced MCP - GUARANTEED VERSION CON DEBUG
import { enhancedChromeDevToolsMCP } from './src/mcp/enhanced-chrome-devtools-mcp-guaranteed.js';

console.log('🧪 TESTING GUARANTEED ENHANCED MCP - DEBUG VERSION');
console.log('=' .repeat(60));

// Test con un solo paso problemático primero
const singleProblemStep = [
  { id: 1, type: 'input', selector: null, value: 'Test' }
];

console.log('📝 Testing with single problematic step:', singleProblemStep);

try {
  // Test de validación primero
  console.log('1. Testing validateAndNormalizeSteps...');
  const normalized = enhancedChromeDevToolsMCP.validateAndNormalizeSteps(singleProblemStep);
  console.log('✅ Normalized:', normalized);
  
  console.log('2. Testing consolidateSteps...');
  const consolidated = enhancedChromeDevToolsMCP.consolidateSteps(normalized);
  console.log('✅ Consolidated:', consolidated);
  
  console.log('3. Testing full processStepsWithIntelligence...');
  const result = await enhancedChromeDevToolsMCP.processStepsWithIntelligence(singleProblemStep);
  console.log('✅ GUARANTEED SUCCESS:', result.success);
  
} catch (error) {
  console.log('❌ Error caught:', error.message);
  console.log('🔍 Stack trace:', error.stack);
}