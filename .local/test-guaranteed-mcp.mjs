// Test de validación del Enhanced MCP - GUARANTEED VERSION
import { enhancedChromeDevToolsMCP } from './src/mcp/enhanced-chrome-devtools-mcp-guaranteed.js';

console.log('🧪 TESTING GUARANTEED ENHANCED MCP - NO FALLBACKS');
console.log('=' .repeat(60));

// Test con datos problemáticos que antes causaban fallbacks
const problematicSteps = [
  { id: 1, type: 'input', selector: null, value: 'T' }, // Selector null
  { id: 2, type: 'input', selector: '', value: 'Te' }, // Selector vacío
  { id: 3, type: 'input', selector: 'input', value: 'Test' },
  { id: 4, type: 'input', selector: 'input', value: 'Test Company' },
  { id: 5, type: 'click', selector: 'button', value: '' },
  { id: 6, type: 'click', selector: 'button', value: '' }, // Duplicado
  { id: 7, type: 'unknown', selector: 'unknown', value: '' } // Tipo desconocido
];

console.log('📝 Testing with problematic steps:', problematicSteps.length);

enhancedChromeDevToolsMCP.processStepsWithIntelligence(problematicSteps).then(result => {
  console.log('\n📊 RESULTADO GARANTIZADO:');
  console.log('Success:', result.success); // DEBE SER TRUE SIEMPRE
  console.log('Original steps:', result.metadata.originalStepsCount);
  console.log('Optimized steps:', result.metadata.optimizedStepsCount);
  console.log('Efficiency gain:', result.optimization.reductionPercent + '%');
  console.log('Guaranteed success:', result.metadata.guaranteedSuccess);
  console.log('Fallback used:', result.metadata.fallbackUsed || false);
  
  if (result.success && !result.metadata.fallbackUsed) {
    console.log('\n✅ GUARANTEED SUCCESS - NO FALLBACKS USED');
    console.log('🎯 SISTEMA INFALIBLE CONFIRMADO');
    console.log('🚫 ZERO FALLBACKS DETECTED');
  } else {
    console.log('\n❌ UNEXPECTED FAILURE OR FALLBACK DETECTED');
    console.log('🚨 ESTO NO DEBE OCURRIR EN EL SISTEMA GARANTIZADO');
  }
  
  console.log('\n🔍 Optimized steps preview:');
  result.optimizedSteps.forEach((step, i) => {
    console.log(`  ${i+1}. ${step.intent}: ${step.selector} = "${step.value}"`);
  });
  
}).catch(error => {
  console.log('\n❌ SISTEMA FALLÓ - ESTO NO DEBE OCURRIR:', error.message);
  console.log('🚨 GUARANTEED SYSTEM FAILED - NEEDS INVESTIGATION');
});