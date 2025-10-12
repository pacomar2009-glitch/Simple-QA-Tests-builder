// SISTEMA AVANZADO DE GESTIÓN DE TOKENS DINÁMICO Y FRAGMENTADO
// Para evitar bans y optimizar el uso de la API de Gemini

class GeminiTokenManager {
  constructor() {
    this.maxTokensPerRequest = 4096;
    this.baseTokensPerAction = 50; // Estimación base por acción
    this.safetyMargin = 500; // Margen de seguridad
    this.requestHistory = [];
    this.rateLimitDelay = 1000; // 1 segundo entre requests
    this.maxRetries = 3;
  }

  // Estimar tokens necesarios basado en contenido
  estimateTokensNeeded(prompt, actions) {
    const basePromptTokens = Math.ceil(prompt.length / 4); // ~4 chars = 1 token
    const actionsTokens = actions.length * this.baseTokensPerAction;
    const responseTokens = 2000; // Estimación para respuesta completa
    
    return basePromptTokens + actionsTokens + responseTokens + this.safetyMargin;
  }

  // Determinar si necesita fragmentación
  needsFragmentation(estimatedTokens) {
    return estimatedTokens > this.maxTokensPerRequest;
  }

  // Fragmentar acciones en chunks manejables
  fragmentActions(actions, maxActionsPerChunk = 5) {
    const chunks = [];
    for (let i = 0; i < actions.length; i += maxActionsPerChunk) {
      chunks.push(actions.slice(i, i + maxActionsPerChunk));
    }
    return chunks;
  }

  // Rate limiting inteligente
  async enforceRateLimit() {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(time => now - time < 60000); // Último minuto
    
    if (recentRequests.length >= 10) { // Máximo 10 requests por minuto
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`⏱️ Rate limiting: esperando ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Delay base entre requests
    if (this.requestHistory.length > 0) {
      const lastRequest = Math.max(...this.requestHistory);
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < this.rateLimitDelay) {
        const waitTime = this.rateLimitDelay - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestHistory.push(Date.now());
    
    // Limpiar historia antigua
    this.requestHistory = this.requestHistory.filter(time => now - time < 300000); // Últimos 5 minutos
  }

  // Backoff exponencial para reintentos
  async exponentialBackoff(attempt) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 segundos
    console.log(`⏳ Backoff: esperando ${delay}ms (intento ${attempt + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Calcular tokens dinámicamente para el request
  calculateDynamicTokens(prompt, isFragment = false) {
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    
    if (isFragment) {
      // Para fragmentos, usar menos tokens de respuesta
      return Math.min(estimatedPromptTokens + 1000, 2048);
    } else {
      // Para requests completos
      return Math.min(estimatedPromptTokens + 2000, this.maxTokensPerRequest);
    }
  }
}

// Función principal para manejar requests a Gemini con gestión avanzada
async function makeGeminiRequestWithTokenManagement(prompt, actions, apiKey, endpoint) {
  const tokenManager = new GeminiTokenManager();
  const estimatedTokens = tokenManager.estimateTokensNeeded(prompt, actions);
  
  console.log(`📊 Tokens estimados: ${estimatedTokens}`);
  
  // Si necesita fragmentación
  if (tokenManager.needsFragmentation(estimatedTokens)) {
    console.log('🧩 Fragmentando request debido a alta demanda de tokens...');
    return await handleFragmentedRequest(tokenManager, prompt, actions, apiKey, endpoint);
  } else {
    console.log('📝 Request simple, procesando directamente...');
    return await handleSingleRequest(tokenManager, prompt, actions, apiKey, endpoint);
  }
}

// Manejar request fragmentado
async function handleFragmentedRequest(tokenManager, basePrompt, actions, apiKey, endpoint) {
  const chunks = tokenManager.fragmentActions(actions);
  const results = [];
  
  console.log(`🔄 Procesando ${chunks.length} fragmentos...`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkPrompt = `${basePrompt}

FRAGMENTO ${i + 1} de ${chunks.length}:
${chunk.map((act, idx) => `${idx + 1}. ${act.type} - selector: ${act.selector || ''} - valor: ${act.value || ''}`).join('\n')}

Genera solo la parte del test correspondiente a estas acciones. Será combinado con otros fragmentos.`;

    try {
      await tokenManager.enforceRateLimit();
      
      const result = await makeGeminiAPICall(
        chunkPrompt, 
        apiKey, 
        endpoint,
        tokenManager.calculateDynamicTokens(chunkPrompt, true)
      );
      
      results.push(result);
      console.log(`✅ Fragmento ${i + 1} completado`);
      
    } catch (error) {
      console.error(`❌ Error en fragmento ${i + 1}:`, error);
      
      // Reintentar con backoff exponencial
      let retryCount = 0;
      while (retryCount < tokenManager.maxRetries) {
        try {
          await tokenManager.exponentialBackoff(retryCount);
          await tokenManager.enforceRateLimit();
          
          const result = await makeGeminiAPICall(
            chunkPrompt, 
            apiKey, 
            endpoint,
            tokenManager.calculateDynamicTokens(chunkPrompt, true)
          );
          
          results.push(result);
          console.log(`✅ Fragmento ${i + 1} completado (reintento ${retryCount + 1})`);
          break;
          
        } catch (retryError) {
          retryCount++;
          if (retryCount >= tokenManager.maxRetries) {
            throw new Error(`Fragmento ${i + 1} falló después de ${tokenManager.maxRetries} reintentos: ${retryError.message}`);
          }
        }
      }
    }
  }
  
  // Combinar resultados
  return await combineFragmentedResults(results, tokenManager, apiKey, endpoint);
}

// Manejar request simple
async function handleSingleRequest(tokenManager, prompt, actions, apiKey, endpoint) {
  const fullPrompt = `${prompt}
${actions.map((act, idx) => `${idx + 1}. ${act.type} - selector: ${act.selector || ''} - valor: ${act.value || ''}`).join('\n')}`;

  let retryCount = 0;
  
  while (retryCount <= tokenManager.maxRetries) {
    try {
      await tokenManager.enforceRateLimit();
      
      return await makeGeminiAPICall(
        fullPrompt, 
        apiKey, 
        endpoint,
        tokenManager.calculateDynamicTokens(fullPrompt, false)
      );
      
    } catch (error) {
      if (retryCount >= tokenManager.maxRetries) {
        throw error;
      }
      
      console.warn(`⚠️ Reintentando request (intento ${retryCount + 1}):`, error.message);
      await tokenManager.exponentialBackoff(retryCount);
      retryCount++;
    }
  }
}

// Función para llamada real a la API
async function makeGeminiAPICall(prompt, apiKey, endpoint, maxTokens) {
  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        maxOutputTokens: maxTokens,
        temperature: 0.2,
        topP: 0.8,
        topK: 10
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API Error ${response.status}: ${errorData}`);
  }
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  if (!text) {
    throw new Error(`No content generated. Finish reason: ${data.candidates?.[0]?.finishReason}`);
  }
  
  return text;
}

// Combinar resultados fragmentados en un test coherente
async function combineFragmentedResults(fragments, tokenManager, apiKey, endpoint) {
  if (fragments.length === 1) {
    return fragments[0];
  }
  
  const combinePrompt = `Combina estos fragmentos de test Playwright en un test completo y coherente:

${fragments.map((fragment, idx) => `=== FRAGMENTO ${idx + 1} ===\n${fragment}\n`).join('\n')}

Genera un test Playwright unificado, completo y funcional que integre todas las acciones de manera coherente.`;

  await tokenManager.enforceRateLimit();
  
  return await makeGeminiAPICall(
    combinePrompt,
    apiKey,
    endpoint,
    tokenManager.calculateDynamicTokens(combinePrompt, false)
  );
}

// Exportar para uso en background.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeGeminiRequestWithTokenManagement };
} else if (typeof window !== 'undefined') {
  window.GeminiTokenManager = { makeGeminiRequestWithTokenManagement };
}