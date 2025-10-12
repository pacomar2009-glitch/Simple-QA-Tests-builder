// Lista los modelos disponibles en Gemini API
console.log('🔍 Listing available Gemini models...');

async function listGeminiModels() {
  const apiKey = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';
  const listEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  try {
    const response = await fetch(`${listEndpoint}?key=${apiKey}`);
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📋 Available models:');
      data.models?.forEach(model => {
        console.log(`- ${model.name}`);
        console.log(`  Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
      });
      
      // Try with a working model
      if (data.models?.length > 0) {
        const workingModel = data.models.find(m => 
          m.supportedGenerationMethods?.includes('generateContent')
        );
        
        if (workingModel) {
          console.log(`\n🧪 Testing with working model: ${workingModel.name}`);
          return await testWithModel(workingModel.name, apiKey);
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error listing models:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
  
  return false;
}

async function testWithModel(modelName, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`;
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, respond with "API_WORKING"' }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Working model response:', result.trim());
      console.log('✅ Working endpoint:', endpoint);
      return true;
    } else {
      console.log('❌ Test failed with working model');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing model:', error.message);
    return false;
  }
}

listGeminiModels().then(success => {
  console.log(success ? '\n🎉 Found working Gemini configuration!' : '\n❌ No working Gemini configuration found');
});