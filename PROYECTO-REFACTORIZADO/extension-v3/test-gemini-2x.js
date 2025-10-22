/**
 * Script de prueba para modelos Gemini 2.x
 */

const API_KEY = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';

// Modelos reales disponibles según el listado
const modelsToTest = [
  // v1 (más estables)
  { model: 'gemini-2.5-flash', version: 'v1' },
  { model: 'gemini-2.5-pro', version: 'v1' },
  { model: 'gemini-2.0-flash', version: 'v1' },
  { model: 'gemini-2.0-flash-lite', version: 'v1' },
  
  // v1beta (más opciones)
  { model: 'gemini-2.5-flash', version: 'v1beta' },
  { model: 'gemini-flash-latest', version: 'v1beta' },
  { model: 'gemini-2.0-flash', version: 'v1beta' }
];

async function testModel(model, version) {
  const baseURL = `https://generativelanguage.googleapis.com/${version}`;
  const url = `${baseURL}/models/${model}:generateContent?key=${API_KEY}`;
  
  console.log(`\n🔍 Testing: ${model} (${version})`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Hello' }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ SUCCESS! Status: ${response.status}`);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No text';
      console.log(`   Response: "${text.substring(0, 50)}..."`);
      return { model, version, success: true, status: response.status };
    } else {
      console.log(`   ❌ FAILED: ${response.status} - ${data.error?.message}`);
      return { model, version, success: false, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { model, version, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 TESTING GEMINI 2.X MODELS');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const { model, version } of modelsToTest) {
    const result = await testModel(model, version);
    results.push(result);
    
    if (result.success) {
      console.log(`   🎉 WORKING!`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS:');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.success);
  
  if (working.length > 0) {
    console.log(`\n✅ WORKING MODELS (${working.length}):`);
    working.forEach(r => {
      console.log(`   - ${r.model} (${r.version})`);
    });
    
    const recommended = working[0];
    console.log(`\n🎯 RECOMMENDED CONFIGURATION:`);
    console.log(`   this.model = '${recommended.model}';`);
    console.log(`   this.baseURL = 'https://generativelanguage.googleapis.com/${recommended.version}';`);
  }
}

main().catch(console.error);
