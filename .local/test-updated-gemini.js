// Test con la nueva configuración de Gemini
console.log('🧪 Testing updated Gemini configuration...');

async function testUpdatedGemini() {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const apiKey = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';
  
  try {
    console.log('📡 Testing endpoint:', endpoint);
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello! Please respond with "GEMINI_CONFIGURED_OK" to confirm you are working.' }] }],
        generationConfig: { maxOutputTokens: 50, temperature: 0 }
      })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('✅ Gemini Response:', result.trim());
      
      // Test with workflow prompt similar to what the extension uses
      console.log('\n🧪 Testing with workflow prompt...');
      
      const workflowResponse = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `WORKFLOW: Generate Test with AI → CSV format for Jira compatibility

You are Gemini AI coordinating with Playwright MCP for test generation. Follow this exact workflow:

1. ORDER Playwright MCP to navigate and reproduce the captured user steps
2. GENERATE a comprehensive manual test in CSV format compatible with Jira import
3. ENSURE the test covers all user interactions and expected outcomes

CAPTURED USER STEPS TO REPRODUCE:
Step 1: click - selector: #login-button - value: N/A - text: Login
Step 2: input - selector: #username - value: testuser - text: N/A

COORDINATE WITH PLAYWRIGHT MCP NOW to validate steps and generate comprehensive CSV test.` }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.2 }
        })
      });
      
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json();
        const workflowResult = workflowData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('✅ Workflow Response Preview:', workflowResult.substring(0, 200) + '...');
        return true;
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
  
  return false;
}

testUpdatedGemini().then(success => {
  console.log(success ? '\n🎉 Gemini is fully configured and working!' : '\n❌ Gemini configuration still has issues');
});