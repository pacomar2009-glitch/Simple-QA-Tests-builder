// Prueba solo de Gemini API
console.log('🧪 Testing only Gemini API...');

async function testGeminiOnly() {
  // Probar con diferentes endpoints
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  ];
  
  const apiKey = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing endpoint: ${endpoint.split('/').pop()}`);
    
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, respond with "TEST_OK"' }] }],
          generationConfig: { maxOutputTokens: 20, temperature: 0 }
        })
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('✅ Response:', result.trim());
        return { success: true, endpoint, result };
      } else {
        const errorText = await response.text();
        console.log('❌ Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Network Error:', error.message);
    }
  }
  
  return { success: false };
}

testGeminiOnly().then(result => {
  if (result.success) {
    console.log('\n🎉 Gemini API is working!');
    console.log('Working endpoint:', result.endpoint);
  } else {
    console.log('\n❌ Gemini API is not working');
  }
});