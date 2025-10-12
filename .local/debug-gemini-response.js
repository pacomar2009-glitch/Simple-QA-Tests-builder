// Debug script para analizar la respuesta de Gemini API

const apiKey = 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24';
const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function debugGeminiResponse() {
  console.log('🔍 DEBUGGING GEMINI API RESPONSE...\n');
  
  const testPrompt = `Genera un test automatizado Playwright siguiendo estas instrucciones:
Acciones capturadas:
1. click - selector: #login-button - valor: 
2. type - selector: #username - valor: testuser
3. click - selector: #submit - valor: `;

  console.log('📤 Prompt enviado:');
  console.log(testPrompt);
  console.log('\n🔗 Haciendo request...');
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: testPrompt }] }],
        generationConfig: { 
          maxOutputTokens: 2048, 
          temperature: 0.2,
          topP: 0.8,
          topK: 10
        }
      })
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\n📋 RESPONSE STRUCTURE ANALYSIS:');
    console.log('Full response:', JSON.stringify(data, null, 2));
    
    console.log('\n🔍 CANDIDATE ANALYSIS:');
    if (data.candidates) {
      console.log(`Number of candidates: ${data.candidates.length}`);
      
      data.candidates.forEach((candidate, index) => {
        console.log(`\nCandidate ${index}:`);
        console.log('  - finishReason:', candidate.finishReason);
        console.log('  - index:', candidate.index);
        
        if (candidate.content) {
          console.log('  - content exists:', !!candidate.content);
          console.log('  - content.parts length:', candidate.content.parts?.length || 0);
          
          if (candidate.content.parts) {
            candidate.content.parts.forEach((part, partIndex) => {
              console.log(`    Part ${partIndex}:`);
              console.log('      - text exists:', !!part.text);
              console.log('      - text length:', part.text?.length || 0);
              if (part.text) {
                console.log('      - text preview:', part.text.substring(0, 100) + '...');
              }
            });
          }
        } else {
          console.log('  - content: null/undefined');
        }
        
        if (candidate.safetyRatings) {
          console.log('  - safetyRatings:', candidate.safetyRatings);
        }
      });
    } else {
      console.log('❌ No candidates in response');
    }
    
    // Intentar extraer texto usando la lógica actual
    const generated = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log(`\n🎯 EXTRACTED TEXT: "${generated}"`);
    console.log(`Length: ${generated.length}`);
    
    if (!generated || generated.trim().length === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED: No text extracted');
      
      // Intentar métodos alternativos
      console.log('\n🔧 TRYING ALTERNATIVE EXTRACTION METHODS:');
      
      // Método 1: Revisar si hay mensaje en error
      if (data.error) {
        console.log('API Error:', data.error);
      }
      
      // Método 2: Revisar safety ratings
      const firstCandidate = data.candidates?.[0];
      if (firstCandidate) {
        console.log('Finish reason:', firstCandidate.finishReason);
        if (firstCandidate.finishReason !== 'STOP') {
          console.log('⚠️  Response may have been blocked. Finish reason:', firstCandidate.finishReason);
        }
      }
    } else {
      console.log('\n✅ SUCCESS: Text extracted successfully');
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

debugGeminiResponse();