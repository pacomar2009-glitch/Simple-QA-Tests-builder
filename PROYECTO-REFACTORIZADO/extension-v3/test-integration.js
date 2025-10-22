/**
 * Test de integración real con Gemini API
 */

const API_KEY = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';

async function testGeminiConnection() {
  const model = 'gemini-2.5-flash';
  const baseURL = 'https://generativelanguage.googleapis.com/v1';
  const url = `${baseURL}/models/${model}:generateContent?key=${API_KEY}`;
  
  console.log('🔍 TESTING GEMINI CONNECTION');
  console.log('=' .repeat(60));
  console.log(`Model: ${model}`);
  console.log(`API Version: v1`);
  console.log(`URL: ${url.replace(API_KEY, 'AIza***')}`);
  console.log('');
  
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

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = 'Error desconocido';
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error?.message || errorMsg;
      } catch (e) {
        errorMsg = response.statusText || errorMsg;
      }

      console.log(`❌ CONNECTION FAILED`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${errorMsg}`);
      return false;
    }

    const data = await response.json();
    
    if (!data.candidates || !Array.isArray(data.candidates)) {
      console.log(`❌ INVALID RESPONSE STRUCTURE`);
      console.log(`   Response:`, JSON.stringify(data, null, 2));
      return false;
    }

    console.log(`✅ CONNECTION SUCCESSFUL!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Candidates: ${data.candidates.length}`);
    
    if (data.candidates[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      console.log(`   Response text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    }
    
    return true;

  } catch (error) {
    console.log(`❌ ERROR`);
    console.log(`   ${error.message}`);
    return false;
  }
}

// Ejecutar test
testGeminiConnection().then(success => {
  console.log('');
  console.log('=' .repeat(60));
  if (success) {
    console.log('🎉 TEST PASSED - Gemini API está funcionando correctamente');
    console.log('');
    console.log('✅ La extensión puede usar:');
    console.log('   this.model = \'gemini-2.5-flash\';');
    console.log('   this.baseURL = \'https://generativelanguage.googleapis.com/v1\';');
  } else {
    console.log('❌ TEST FAILED - Hay problemas con la conexión');
  }
  console.log('=' .repeat(60));
  process.exit(success ? 0 : 1);
});
