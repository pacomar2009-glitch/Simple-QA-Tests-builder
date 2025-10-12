// Test script para verificar la integración completa
console.log('🧪 Testing complete integration...');

async function testGeminiAPI() {
  console.log('\n📡 Testing Gemini API...');
  
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const apiKey = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Test connection - respond with only "GEMINI_OK"' }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0 }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Gemini API Response:', result.trim());
      return true;
    } else {
      console.log('❌ Gemini API Error:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Gemini API Error:', error.message);
    return false;
  }
}

async function testMCPServer() {
  console.log('\n🚀 Testing MCP Server...');
  
  try {
    // Test health check
    const healthResponse = await fetch('http://localhost:3001/health');
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ MCP Server Health:', health.status);
    } else {
      console.log('❌ MCP Health Check Failed:', healthResponse.status);
      return false;
    }
    
    // Test generate endpoint with sample data
    const testSteps = [
      { type: 'click', selector: '#test-button', text: 'Test Button' },
      { type: 'input', selector: '#test-input', value: 'test value' }
    ];
    
    const generateResponse = await fetch('http://localhost:3001/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
        steps: testSteps,
        instructions: 'Generate test for integration verification'
      })
    });
    
    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ MCP Generate Response:', result.success ? 'Success' : 'Failed');
      return true;
    } else {
      console.log('❌ MCP Generate Failed:', generateResponse.status);
      return false;
    }
    
  } catch (error) {
    console.log('❌ MCP Server Error:', error.message);
    return false;
  }
}

async function runTests() {
  const geminiOk = await testGeminiAPI();
  const mcpOk = await testMCPServer();
  
  console.log('\n📊 Integration Test Results:');
  console.log(`Gemini API: ${geminiOk ? '✅ Working' : '❌ Failed'}`);
  console.log(`MCP Server: ${mcpOk ? '✅ Working' : '❌ Failed'}`);
  
  if (geminiOk && mcpOk) {
    console.log('\n🎉 Complete integration ready for use!');
  } else {
    console.log('\n⚠️  Some components need attention');
  }
}

runTests().catch(console.error);