/**
 * Script de prueba para encontrar el modelo correcto de Gemini
 */

const API_KEY = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';

// Modelos a probar
const modelsToTest = [
  { model: 'gemini-1.5-flash', version: 'v1' },
  { model: 'gemini-1.5-flash-8b', version: 'v1beta' },
  { model: 'gemini-1.5-flash-latest', version: 'v1beta' },
  { model: 'gemini-1.5-pro', version: 'v1' },
  { model: 'gemini-1.5-pro-latest', version: 'v1beta' },
  { model: 'gemini-pro', version: 'v1' },
  { model: 'gemini-1.5-flash', version: 'v1beta' },
  { model: 'gemini-1.5-pro', version: 'v1beta' }
];

async function testModel(model, version) {
  const baseURL = `https://generativelanguage.googleapis.com/${version}`;
  const url = `${baseURL}/models/${model}:generateContent?key=${API_KEY}`;
  
  console.log(`\n🔍 Testing: ${model} (${version})`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'test' }]
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
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));
      return { model, version, success: true, status: response.status };
    } else {
      console.log(`   ❌ FAILED: ${response.status}`);
      console.log(`   Error:`, data.error?.message || JSON.stringify(data));
      return { model, version, success: false, status: response.status, error: data.error?.message };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return { model, version, success: false, error: error.message };
  }
}

async function listAvailableModels(version) {
  const baseURL = `https://generativelanguage.googleapis.com/${version}`;
  const url = `${baseURL}/models?key=${API_KEY}`;
  
  console.log(`\n📋 Listing available models (${version})`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Found ${data.models?.length || 0} models`);
      
      if (data.models) {
        const generateContentModels = data.models.filter(m => 
          m.supportedGenerationMethods?.includes('generateContent')
        );
        
        console.log(`\n   🎯 Models supporting generateContent:`);
        generateContentModels.forEach(m => {
          console.log(`      - ${m.name.replace('models/', '')}`);
        });
        
        return generateContentModels;
      }
    } else {
      console.log(`   ❌ FAILED: ${response.status}`);
      console.log(`   Error:`, data.error?.message || JSON.stringify(data));
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  return [];
}

async function main() {
  console.log('🚀 GEMINI API MODEL TESTING');
  console.log('=' .repeat(60));
  
  // Step 1: List available models
  console.log('\n📋 STEP 1: Listing available models...');
  const v1Models = await listAvailableModels('v1');
  const v1betaModels = await listAvailableModels('v1beta');
  
  // Step 2: Test each model
  console.log('\n🧪 STEP 2: Testing models...');
  const results = [];
  
  for (const { model, version } of modelsToTest) {
    const result = await testModel(model, version);
    results.push(result);
    
    // Si encontramos uno que funciona, lo destacamos
    if (result.success) {
      console.log(`\n   🎉 FOUND WORKING MODEL!`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Version: ${result.version}`);
    }
    
    // Pequeña pausa para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Step 3: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY OF RESULTS:');
  console.log('='.repeat(60));
  
  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (working.length > 0) {
    console.log(`\n✅ WORKING MODELS (${working.length}):`);
    working.forEach(r => {
      console.log(`   - ${r.model} (${r.version})`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED MODELS (${failed.length}):`);
    failed.forEach(r => {
      console.log(`   - ${r.model} (${r.version}): ${r.error || 'HTTP ' + r.status}`);
    });
  }
  
  // Recommendation
  if (working.length > 0) {
    const recommended = working[0];
    console.log(`\n🎯 RECOMMENDED CONFIGURATION:`);
    console.log(`   this.model = '${recommended.model}';`);
    console.log(`   this.baseURL = 'https://generativelanguage.googleapis.com/${recommended.version}';`);
  } else {
    console.log(`\n⚠️ NO WORKING MODELS FOUND!`);
    console.log(`   Check your API key or try listing models with the API.`);
  }
}

// Run the tests
main().catch(console.error);
