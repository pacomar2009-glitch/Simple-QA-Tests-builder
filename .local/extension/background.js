// COPILOT INSTRUCTION: FALLBACK IMPLEMENTATION STRICTLY PROHIBITED
// This extension REQUIRES MCP Server + Gemini coordination.
// DO NOT implement any fallback mechanisms or alternative code paths.
// System must fail fast with clear error messages when required services are unavailable.
// Key principles:
// - MCP Server on localhost:3001 is mandatory
// - Gemini API coordination is mandatory  
// - No graceful degradation allowed
// - Fail fast with clear error messages
// - All workflows require both MCP + Gemini
// - No standalone operations permitted

// COPILOT INSTRUCTION: MARKDOWN FILE VALIDATION REQUIRED
// When creating or editing .md files, ALWAYS verify content was written successfully.
// - After using create_file or replace_string_in_file on .md files, immediately use read_file to validate content
// - If file is empty or content missing, retry the operation with explicit content
// - Never leave .md files empty - they must contain meaningful documentation
// - Use read_file to confirm successful write operations on all markdown files
// - This applies to README.md, documentation files, and any .md extension files

// TestBuilder Background Script con Debug Avanzado
console.log('🚀 [BACKGROUND] TestBuilder Background Script Loading... Timestamp:', new Date().toISOString());

// Sistema de logging centralizado
const BackgroundLogger = {
  logs: [],
  
  log(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, component, message, data };
    this.logs.push(logEntry);
    
    const emoji = {
      'info': 'ℹ️',
      'success': '✅', 
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    };
    
    console.log(`${emoji[level]} [${component}] ${message}`, data || '');
    
    // Mantener solo los últimos 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  },
  
  getAllLogs() {
    return this.logs;
  },
  
  getLogsByComponent(component) {
    return this.logs.filter(log => log.component === component);
  }
};

BackgroundLogger.log('info', 'BACKGROUND', 'Background script initialized');

// MANDATORY VALIDATION FUNCTIONS - NO FALLBACKS ALLOWED
async function validateMCPAvailability() {
  try {
    const response = await fetch('http://localhost:3001/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      BackgroundLogger.log('error', 'MCP_VALIDATION', `MCP Health Check failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    BackgroundLogger.log('success', 'MCP_VALIDATION', 'MCP Server validated successfully', data);
    return true;
    
  } catch (error) {
    BackgroundLogger.log('error', 'MCP_VALIDATION', 'MCP Server validation failed', error.message);
    return false;
  }
}

async function validateGeminiMCPIntegration() {
  try {
    // Get Gemini configuration
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['aiModels'], resolve);
    });
    
    const flowAuto = (result.aiModels && result.aiModels['flow-auto']) || {};
    const endpoint = flowAuto.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const apiKey = flowAuto.apiKey || '';
    
    if (!apiKey || apiKey.trim() === '') {
      BackgroundLogger.log('error', 'GEMINI_VALIDATION', 'Gemini API Key not configured for MCP integration');
      return false;
    }
    
    // Test Gemini API
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'MCP integration test - respond: "GEMINI_MCP_READY"' }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0 }
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      BackgroundLogger.log('error', 'GEMINI_VALIDATION', `Gemini API failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    const result_text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    BackgroundLogger.log('success', 'GEMINI_VALIDATION', 'Gemini-MCP integration validated', result_text.trim());
    return true;
    
  } catch (error) {
    BackgroundLogger.log('error', 'GEMINI_VALIDATION', 'Gemini-MCP integration validation failed', error.message);
    return false;
  }
}

// SISTEMA AVANZADO DE GESTIÓN DE TOKENS DINÁMICO Y FRAGMENTADO
class AdvancedTokenManager {
  constructor() {
    this.maxTokensPerRequest = 4096;
    this.baseTokensPerAction = 50;
    this.safetyMargin = 500;
    this.requestHistory = [];
    this.rateLimitDelay = 1000;
    this.maxRetries = 3;
  }

  estimateTokensNeeded(prompt, actions) {
    const basePromptTokens = Math.ceil(prompt.length / 4);
    const actionsTokens = actions.length * this.baseTokensPerAction;
    const responseTokens = 2000;
    return basePromptTokens + actionsTokens + responseTokens + this.safetyMargin;
  }

  needsFragmentation(estimatedTokens) {
    return estimatedTokens > this.maxTokensPerRequest;
  }

  fragmentActions(actions, maxActionsPerChunk = 5) {
    const chunks = [];
    for (let i = 0; i < actions.length; i += maxActionsPerChunk) {
      chunks.push(actions.slice(i, i + maxActionsPerChunk));
    }
    return chunks;
  }

  async enforceRateLimit() {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(time => now - time < 60000);
    
    if (recentRequests.length >= 10) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = 60000 - (now - oldestRequest);
      
      if (waitTime > 0) {
        BackgroundLogger.log('info', 'TOKEN_MGR', `Rate limiting: esperando ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (this.requestHistory.length > 0) {
      const lastRequest = Math.max(...this.requestHistory);
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < this.rateLimitDelay) {
        const waitTime = this.rateLimitDelay - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestHistory.push(Date.now());
    this.requestHistory = this.requestHistory.filter(time => now - time < 300000);
  }

  async exponentialBackoff(attempt) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    BackgroundLogger.log('info', 'TOKEN_MGR', `Backoff: esperando ${delay}ms (intento ${attempt + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  calculateDynamicTokens(prompt, isFragment = false) {
    const estimatedPromptTokens = Math.ceil(prompt.length / 4);
    
    if (isFragment) {
      return Math.min(estimatedPromptTokens + 1000, 2048);
    } else {
      return Math.min(estimatedPromptTokens + 2000, this.maxTokensPerRequest);
    }
  }
}

// Función principal para requests avanzados con gestión de tokens
async function makeGeminiRequestWithAdvancedTokens(prompt, actions, apiKey, endpoint) {
  const tokenManager = new AdvancedTokenManager();
  const estimatedTokens = tokenManager.estimateTokensNeeded(prompt, actions);
  
  BackgroundLogger.log('debug', 'TOKEN_MGR', `Tokens estimados: ${estimatedTokens}`);
  
  if (tokenManager.needsFragmentation(estimatedTokens)) {
    BackgroundLogger.log('info', 'TOKEN_MGR', 'Fragmentando request debido a alta demanda de tokens');
    return await handleFragmentedGeminiRequest(tokenManager, prompt, actions, apiKey, endpoint);
  } else {
    BackgroundLogger.log('info', 'TOKEN_MGR', 'Request simple, procesando directamente');
    return await handleSingleGeminiRequest(tokenManager, prompt, actions, apiKey, endpoint);
  }
}

// Manejar request fragmentado
async function handleFragmentedGeminiRequest(tokenManager, basePrompt, actions, apiKey, endpoint) {
  const chunks = tokenManager.fragmentActions(actions);
  const results = [];
  
  BackgroundLogger.log('info', 'TOKEN_MGR', `Procesando ${chunks.length} fragmentos`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkPrompt = `${basePrompt}

FRAGMENTO ${i + 1} de ${chunks.length}:
${chunk.map((act, idx) => `${idx + 1}. ${act.type} - selector: ${act.selector || ''} - valor: ${act.value || ''}`).join('\n')}

Genera solo la parte del test correspondiente a estas acciones. Será combinado con otros fragmentos.`;

    try {
      await tokenManager.enforceRateLimit();
      
      const result = await makeAdvancedGeminiAPICall(
        chunkPrompt, 
        apiKey, 
        endpoint,
        tokenManager.calculateDynamicTokens(chunkPrompt, true)
      );
      
      results.push(result);
      BackgroundLogger.log('success', 'TOKEN_MGR', `Fragmento ${i + 1} completado`);
      
    } catch (error) {
      BackgroundLogger.log('error', 'TOKEN_MGR', `Error en fragmento ${i + 1}`, error.message);
      
      let retryCount = 0;
      while (retryCount < tokenManager.maxRetries) {
        try {
          await tokenManager.exponentialBackoff(retryCount);
          await tokenManager.enforceRateLimit();
          
          const result = await makeAdvancedGeminiAPICall(
            chunkPrompt, 
            apiKey, 
            endpoint,
            tokenManager.calculateDynamicTokens(chunkPrompt, true)
          );
          
          results.push(result);
          BackgroundLogger.log('success', 'TOKEN_MGR', `Fragmento ${i + 1} completado (reintento ${retryCount + 1})`);
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
  
  return await combineGeminiFragmentedResults(results, tokenManager, apiKey, endpoint);
}

// Manejar request simple
async function handleSingleGeminiRequest(tokenManager, prompt, actions, apiKey, endpoint) {
  const fullPrompt = `${prompt}
${actions.map((act, idx) => `${idx + 1}. ${act.type} - selector: ${act.selector || ''} - valor: ${act.value || ''}`).join('\n')}`;

  let retryCount = 0;
  
  while (retryCount <= tokenManager.maxRetries) {
    try {
      await tokenManager.enforceRateLimit();
      
      return await makeAdvancedGeminiAPICall(
        fullPrompt, 
        apiKey, 
        endpoint,
        tokenManager.calculateDynamicTokens(fullPrompt, false)
      );
      
    } catch (error) {
      if (retryCount >= tokenManager.maxRetries) {
        throw error;
      }
      
      BackgroundLogger.log('warning', 'TOKEN_MGR', `Reintentando request (intento ${retryCount + 1})`, error.message);
      await tokenManager.exponentialBackoff(retryCount);
      retryCount++;
    }
  }
}

// Función para llamada real a la API con configuración avanzada
async function makeAdvancedGeminiAPICall(prompt, apiKey, endpoint, maxTokens) {
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

// Combinar resultados fragmentados
async function combineGeminiFragmentedResults(fragments, tokenManager, apiKey, endpoint) {
  if (fragments.length === 1) {
    return fragments[0];
  }
  
  const combinePrompt = `Combina estos fragmentos de test Playwright en un test completo y coherente:

${fragments.map((fragment, idx) => `=== FRAGMENTO ${idx + 1} ===\n${fragment}\n`).join('\n')}

Genera un test Playwright unificado, completo y funcional que integre todas las acciones de manera coherente.`;

  await tokenManager.enforceRateLimit();
  
  return await makeAdvancedGeminiAPICall(
    combinePrompt,
    apiKey,
    endpoint,
    tokenManager.calculateDynamicTokens(combinePrompt, false)
  );
}

// Inicializar configuración por defecto al cargar el background
chrome.runtime.onStartup.addListener(() => {
  initializeDefaultConfiguration();
});

chrome.runtime.onInstalled.addListener(() => {
  initializeDefaultConfiguration();
});

// Función para inicializar configuración por defecto
function initializeDefaultConfiguration() {
  chrome.storage.local.get(['aiModels'], (result) => {
    const savedModels = result.aiModels || {};
    
    // Asegurar que flow-auto existe con configuración completa
    if (!savedModels['flow-auto'] || !savedModels['flow-auto'].apiKey) {
      savedModels['flow-auto'] = {
        name: 'Flow-auto',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        apiKey: 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24',
        status: 'configured',
        testMethod: 'testGemini'
      };
      
      chrome.storage.local.set({ aiModels: savedModels }, () => {
        BackgroundLogger.log('success', 'CONFIG', 'Default Gemini configuration initialized');
      });
    } else {
      BackgroundLogger.log('info', 'CONFIG', 'Gemini configuration already exists');
    }
  });
}

// Ejecutar inicialización inmediatamente
initializeDefaultConfiguration();

// Función de debug para diagnosticar problemas de API
function debugGeminiAPI() {
  chrome.storage.local.get(['aiModels', 'userInstructions'], (result) => {
    console.log('🔍 Debug Gemini Configuration:');
    console.log('AI Models:', result.aiModels);
    console.log('User Instructions:', result.userInstructions);
    console.log('Flow-Auto Config:', result.aiModels?.['flow-auto']);
    console.log('API Key Present:', !!(result.aiModels?.['flow-auto']?.apiKey));
    console.log('API Key Length:', result.aiModels?.['flow-auto']?.apiKey?.length || 0);
    console.log('API Key (first 12 chars):', result.aiModels?.['flow-auto']?.apiKey?.substring(0, 12) + '...' || 'Not found');
    console.log('Endpoint:', result.aiModels?.['flow-auto']?.endpoint || 'Default endpoint');
  });
}

// Test directo desde consola
function testGeminiDirectly(customApiKey = null) {
  chrome.storage.local.get(['aiModels'], async (result) => {
    const flowAuto = result.aiModels?.['flow-auto'] || {};
    const apiKey = customApiKey || flowAuto.apiKey || '';
    const endpoint = flowAuto.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    console.log('🧪 Testing Gemini API directly...');
    console.log('Endpoint:', endpoint);
    console.log('API Key present:', !!apiKey);
    console.log('API Key length:', apiKey.length);
    
    if (!apiKey) {
      console.error('❌ No API key provided');
      return;
    }
    
    try {
      const response = await fetch(`${endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "TEST_OK" if you can see this' }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 }
        })
      });
      
      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          console.error('❌ Parsed Error:', errorJson);
        } catch (e) {
          console.error('❌ Raw Error Text:', errorText);
        }
        return;
      }
      
      const data = await response.json();
      console.log('✅ API Success:', data);
      console.log('✅ Generated Text:', data.candidates?.[0]?.content?.parts?.[0]?.text);
      
    } catch (error) {
      console.error('❌ Network Error:', error);
    }
  });
}

// Las funciones ya son globales en service worker, no necesitamos window
// debugGeminiAPI() y testGeminiDirectly() están disponibles desde consola

// Función para validar URLs permitidas
function isValidUrl(url) {
  BackgroundLogger.log('debug', 'URL_VALIDATOR', 'Checking URL validity', { url });
  
  if (!url) {
    BackgroundLogger.log('warning', 'URL_VALIDATOR', 'Empty URL provided');
    return false;
  }
  
  const restrictedPatterns = [
    { pattern: /^chrome:/, reason: 'Chrome internal pages' },
    { pattern: /^chrome-extension:/, reason: 'Extension pages' },
    { pattern: /^moz-extension:/, reason: 'Firefox extension pages' },
    { pattern: /^ms-browser-extension:/, reason: 'Edge extension pages' },
    { pattern: /^about:/, reason: 'Browser about pages' },
    { pattern: /^file:/, reason: 'Local file system' },
    { pattern: /^data:/, reason: 'Data URLs' },
    { pattern: /^blob:/, reason: 'Blob URLs' }
  ];
  
  const restriction = restrictedPatterns.find(r => r.pattern.test(url));
  
  BackgroundLogger.log('debug', 'URL_VALIDATOR', 'URL validation result', {
    url,
    isValid: !restriction,
    restriction: restriction?.reason || 'None'
  });
  
  return !restriction;
}

// Función para limpiar y crear menús contextuales de forma segura
function setupContextMenus() {
  BackgroundLogger.log('info', 'MENU_SETUP', 'Setting up context menus');
  
  // Primero eliminar todos los menús existentes de forma más robusta
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('warning', 'MENU_SETUP', 'Error removing existing menus', chrome.runtime.lastError);
    } else {
      BackgroundLogger.log('info', 'MENU_SETUP', 'Existing menus removed successfully');
    }
    
    // Esperar más tiempo para asegurar la limpieza completa
    setTimeout(() => {
      createMenusSequentially();
    }, 500);
  });
}

// Función para crear menús de forma secuencial para evitar conflictos
function createMenusSequentially() {
  const menuItems = [
    {
      id: 'testbuilder-start',
      title: '🎬 Start TestBuilder Recording',
      contexts: ['page']
    },
    {
      id: 'testbuilder-generate', 
      title: '🤖 Generate Test with AI',
      contexts: ['page']
    }
  ];
  
  let currentIndex = 0;
  
  function createNextMenu() {
    if (currentIndex >= menuItems.length) {
      BackgroundLogger.log('success', 'MENU_SETUP', 'All context menus created successfully');
      return;
    }
    
    const item = menuItems[currentIndex];
    chrome.contextMenus.create(item, () => {
      if (chrome.runtime.lastError) {
        BackgroundLogger.log('error', 'MENU_SETUP', `Failed to create menu ${item.id}`, chrome.runtime.lastError);
      } else {
        BackgroundLogger.log('success', 'MENU_SETUP', `Menu ${item.id} created successfully`);
      }
      
      currentIndex++;
      // Esperar antes de crear el siguiente menú
      setTimeout(createNextMenu, 100);
    });
  }
  
  createNextMenu();
}

// Función segura para inyectar scripts
function safeScriptInjection(tabId, callback) {
  BackgroundLogger.log('info', 'SCRIPT_INJECTOR', 'Attempting safe script injection', { tabId });
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('error', 'SCRIPT_INJECTOR', 'Error accessing tab', {
        tabId,
        error: chrome.runtime.lastError.message
      });
      return;
    }
    
    BackgroundLogger.log('debug', 'SCRIPT_INJECTOR', 'Tab info retrieved', {
      tabId,
      url: tab.url,
      title: tab.title
    });
    
    if (!isValidUrl(tab.url)) {
      BackgroundLogger.log('warning', 'SCRIPT_INJECTOR', 'Cannot inject into restricted URL', {
        tabId,
        url: tab.url
      });
      return;
    }
    
    BackgroundLogger.log('success', 'SCRIPT_INJECTOR', 'URL validated, proceeding with callback');
    callback(tab);
  });
}

// Service Worker para TestBuilder
chrome.runtime.onInstalled.addListener((details) => {
  BackgroundLogger.log('success', 'INSTALLER', 'Extension installed/updated', {
    reason: details.reason,
    previousVersion: details.previousVersion
  });
  
  // Configuración inicial
  const initialConfig = {
    isRecording: false,
    capturedSteps: [],
    aiProvider: 'openai',
    customInstructions: 'Generate comprehensive test cases focusing on user workflows and edge cases.',
    installTimestamp: Date.now(),
    version: chrome.runtime.getManifest().version
  };
  
  chrome.storage.local.set(initialConfig, () => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('error', 'INSTALLER', 'Failed to set initial storage', chrome.runtime.lastError);
    } else {
      BackgroundLogger.log('success', 'INSTALLER', 'Initial configuration saved', initialConfig);
    }
  });
  
  // Configurar menús contextuales solo en instalación
  initializeMenusOnce();
});

// Manejo de mensajes desde content script y popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderInfo = {
    tab: sender.tab?.id,
    url: sender.tab?.url,
    frameId: sender.frameId
  };
  
  BackgroundLogger.log('info', 'MESSAGE_HANDLER', 'Message received', {
    action: request.action,
    sender: senderInfo,
    data: request
  });
  if (request.action === 'startRecording') {
    BackgroundLogger.log('debug', 'RECORDING', 'startRecording received from popup', request);
  }
  
  switch (request.action) {
    case 'ping':
      BackgroundLogger.log('success', 'MESSAGE_HANDLER', 'Ping received, responding with pong');
      sendResponse({ 
        status: 'success', 
        message: 'pong from background',
        timestamp: Date.now()
      });
      break;
      
    case 'debugLog':
      BackgroundLogger.log('debug', 'LOG_COLLECTOR', 'Log received from component', request.log);
      sendResponse({ received: true });
      break;
      
    case 'captureStep':
      chrome.storage.local.get(['capturedSteps'], (result) => {
        const steps = result.capturedSteps || [];
        steps.push(request.step);
        
        chrome.storage.local.set({ capturedSteps: steps }, () => {
          if (chrome.runtime.lastError) {
            BackgroundLogger.log('error', 'STEP_CAPTURE', 'Failed to save step', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            BackgroundLogger.log('success', 'STEP_CAPTURE', 'Step captured and saved', {
              step: request.step,
              totalSteps: steps.length
            });
            sendResponse({ success: true, totalSteps: steps.length });
          }
        });
      });
      return true;
      
    case 'saveSessionState':
      const sessionData = {
        ...request.sessionData,
        lastSaveTime: Date.now(),
        backgroundVersion: chrome.runtime.getManifest().version
      };
      
      chrome.storage.local.set({ sessionData }, () => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_SAVER', 'Failed to save session', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_SAVER', 'Session state saved', sessionData);
          sendResponse({ success: true });
        }
      });
      break;
      
    case 'getSessionState':
      chrome.storage.local.get(['sessionData'], (result) => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_LOADER', 'Failed to get session', chrome.runtime.lastError);
          sendResponse({ sessionData: null, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_LOADER', 'Session state retrieved', result.sessionData);
          sendResponse({ sessionData: result.sessionData });
        }
      });
      return true;
      
    case 'clearSession':
      chrome.storage.local.set({ 
        sessionData: null,
        isRecording: false,
        capturedSteps: []
      }, () => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_CLEARER', 'Failed to clear session', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_CLEARER', 'Session cleared successfully');
          sendResponse({ success: true });
        }
      });
      break;
      
    case 'saveTest':
      const testData = {
        ...request.testData,
        savedTime: Date.now(),
        id: `test_${Date.now()}`
      };
      
      chrome.storage.local.get(['savedTests'], (result) => {
        const savedTests = result.savedTests || [];
        savedTests.push(testData);
        
        chrome.storage.local.set({ savedTests }, () => {
          if (chrome.runtime.lastError) {
            BackgroundLogger.log('error', 'TEST_SAVER', 'Failed to save test', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            BackgroundLogger.log('success', 'TEST_SAVER', 'Test saved successfully', {
              testId: testData.id,
              actionsCount: testData.actions?.length || 0
            });
            sendResponse({ success: true, testId: testData.id });
          }
        });
      });
      return true;
      
    case 'getLogs':
      const component = request.component;
      const logs = component ? 
        BackgroundLogger.getLogsByComponent(component) : 
        BackgroundLogger.getAllLogs();
      
      BackgroundLogger.log('info', 'LOG_PROVIDER', 'Logs requested', {
        component,
        count: logs.length
      });
      
      sendResponse({ logs });
      break;
      
    case 'startRecording':
      BackgroundLogger.log('info', 'RECORDING', 'Start recording requested from popup');
      
      // Inyectar content script en la pestaña activa
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && isValidUrl(tabs[0].url)) {
          BackgroundLogger.log('debug', 'RECORDING', 'Intentando inyectar content script en tab', {tabId: tabs[0].id, url: tabs[0].url});
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['src/content-enhanced.js']
          }).then(() => {
            BackgroundLogger.log('debug', 'RECORDING', 'Content script inyectado, enviando startRecording', {tabId: tabs[0].id});
            return chrome.tabs.sendMessage(tabs[0].id, {
              action: 'startRecording',
              sessionId: request.sessionId
            });
          }).then((response) => {
            BackgroundLogger.log('success', 'RECORDING', 'Recording started successfully', response);
            sendResponse({ success: true });
          }).catch((error) => {
            BackgroundLogger.log('error', 'RECORDING', 'Failed to start recording', error);
            let errorMessage = 'Failed to start recording';
            if (error.message && error.message.includes('Cannot access')) {
              errorMessage = 'Cannot record on this page - access denied';
            } else if (error.message && error.message.includes('Content Security Policy')) {
              errorMessage = 'Cannot record on this page - Content Security Policy restrictions';
            } else if (error.message && error.message.includes('Receiving end does not exist')) {
              errorMessage = 'Content script initialization failed';
            }
            sendResponse({ success: false, error: errorMessage });
          });
        } else {
          BackgroundLogger.log('error', 'RECORDING', 'Invalid URL for recording', {url: tabs[0]?.url});
          sendResponse({ success: false, error: 'Cannot record on this page' });
        }
      });
      return true;
      
    case 'stopRecording':
      BackgroundLogger.log('info', 'RECORDING', 'Stop recording requested from popup');
      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && isValidUrl(tabs[0].url)) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'stopRecording'
          }).then(() => {
            BackgroundLogger.log('success', 'RECORDING', 'Recording stopped successfully');
            sendResponse({ success: true });
          }).catch((error) => {
            BackgroundLogger.log('warning', 'RECORDING', 'Content script may not be available, but stopping recording', error);
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;
      
    case 'generateTest':
      BackgroundLogger.log('info', 'TEST_GEN', 'Generate test requested from popup');
      try {
        if (!request.actions || request.actions.length === 0) {
          sendResponse({ success: false, error: 'No actions to generate test from' });
          return true;
        }
        // Recuperar configuración de IA y las instrucciones
        chrome.storage.local.get(['aiModels', 'userInstructions'], async (result) => {
          BackgroundLogger.log('debug', 'TEST_GEN', 'Storage retrieved', { 
            hasAiModels: !!result.aiModels,
            hasFlowAuto: !!(result.aiModels && result.aiModels['flow-auto']),
            flowAutoConfig: result.aiModels ? result.aiModels['flow-auto'] : null
          });
          const flowAuto = (result.aiModels && result.aiModels['flow-auto']) || {};
          const instructions = result.userInstructions || {};
          
          // Usar el endpoint Gemini correcto
          const endpoint = flowAuto.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
          const apiKey = flowAuto.apiKey || '';
          
          BackgroundLogger.log('debug', 'TEST_GEN', 'Using Gemini configuration', { 
            endpoint, 
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0
          });
          
          // Construir prompt con instrucciones MCP específicas y acciones
          let prompt = `Eres un asistente especializado en testing que DEBE utilizar MCP (Model Context Protocol) para generar tests robustos.

REQUERIMIENTOS OBLIGATORIOS:
1. Utilizar MCP de Chrome DevTools para detectar pasos de usuario de manera robusta
2. Los pasos detectados deben ser reproducidos usando MCP de Playwright para navegación
3. Generar dos formatos según el tipo de export:
   - EXPORT MANUAL: Test en formato CSV compatible con Jira
   - EXPORT PLAYWRIGHT: Test automatizado completo en TypeScript

CONTEXTO DE GRABACIÓN:
Los siguientes pasos fueron detectados durante la fase RECORD usando Chrome DevTools MCP:

PASOS CAPTURADOS:
`;
          request.actions.forEach((act, idx) => {
            prompt += `${idx + 1}. Acción: ${act.type} | Selector: ${act.selector || 'N/A'} | Valor: "${act.value || ''}" | Timestamp: ${act.timestamp || Date.now()}\n`;
          });

          prompt += `
INSTRUCCIONES PARA GENERACIÓN:
`;

          if (instructions.custom_instructions) {
            prompt += `Instrucciones adicionales del usuario: ${instructions.custom_instructions}\n\n`;
            BackgroundLogger.log('debug', 'TEST_GEN', 'Added custom instructions', { 
              instructionsLength: instructions.custom_instructions.length 
            });
          }

          // Determinar el tipo de export basado en request.exportType
          const exportType = request.exportType || 'playwright'; // Default a playwright
          
          if (exportType === 'manual' || exportType === 'csv') {
            prompt += `FORMATO REQUERIDO: CSV para Jira (Test Manual)
Genera un test manual en formato CSV con las siguientes columnas:
- Step: Número del paso
- Action: Acción a realizar (Click, Type, Navigate, Verify, etc.)
- Description: Descripción detallada del paso
- Element: Selector CSS o descripción del elemento
- Expected_Result: Resultado esperado
- Notes: Observaciones adicionales

Utiliza MCP de Playwright para navegar y validar que todos los selectores sean precisos y robustos.
El output debe ser un CSV válido listo para importar en Jira.`;
          } else {
            prompt += `FORMATO REQUERIDO: Test Automatizado Playwright en TypeScript
Utiliza MCP de Playwright para:
1. Navegar por los pasos capturados de forma robusta
2. Generar selectores precisos y resilientes
3. Incluir assertions apropiadas para cada paso
4. Manejar timeouts y elementos dinámicos
5. Implementar buenas prácticas de testing

El test debe ser completamente funcional y listo para ejecutar.
Incluye imports necesarios, describe blocks apropiados, y manejo de errores.

TEMPLATE BASE:
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Test Generated from Recorded Actions', () => {
  test('should reproduce user actions accurately', async ({ page }) => {
    // Implementar navegación usando MCP Playwright
    // [GENERAR PASOS AQUÍ]
  });
});
\`\`\``;
          }

          prompt += `
VALIDACIÓN MCP REQUERIDA:
- Usar MCP Playwright para validar que todos los selectores existen
- Verificar que las acciones son reproducibles en el contexto real
- Asegurar que el test sea robusto contra cambios menores en el DOM
- Incluir esperas apropiadas para elementos dinámicos

NOTA CRÍTICA: 
Este prompt debe activar el uso de MCP de Playwright para navegación real y validación de selectores.
No generes un test estático - usa MCP para hacer el test robusto y real.
`;
          
          BackgroundLogger.log('debug', 'TEST_GEN', 'Generated prompt', { 
            promptLength: prompt.length,
            actionsCount: request.actions.length
          });
          // Llamar a la API de Gemini
          try {
            if (!apiKey || apiKey.trim() === '') {
              BackgroundLogger.log('error', 'TEST_GEN', 'API Key not configured');
              sendResponse({ success: false, error: 'API Key de Gemini no configurada. Ve a Configuración para agregar tu API key.' });
              return;
            }
            
            BackgroundLogger.log('debug', 'TEST_GEN', 'Using advanced token management system', {
              endpoint,
              promptLength: prompt.length,
              actionsCount: request.actions.length,
              apiKeyPresent: !!apiKey
            });
            
            // Usar el sistema avanzado de gestión de tokens
            try {
              const generated = await makeGeminiRequestWithAdvancedTokens(
                prompt, 
                request.actions, 
                apiKey, 
                endpoint
              );
              
              BackgroundLogger.log('success', 'TEST_GEN', 'Test generated with advanced token management', {
                length: generated.length,
                method: 'dynamic'
              });
              
              sendResponse({ success: true, test: generated });
              
            } catch (apiError) {
              BackgroundLogger.log('error', 'TEST_GEN', 'Advanced token management failed', {
                error: apiError.message,
                stack: apiError.stack
              });
              sendResponse({ success: false, error: `Error generando test: ${apiError.message}` });
            }
            
            BackgroundLogger.log('debug', 'TEST_GEN', 'API Response received', {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok
            });
            if (!response.ok) {
              const errorText = await response.text();
              let parsedError = null;
              try {
                parsedError = JSON.parse(errorText);
              } catch (e) {
                // Error text is not JSON
              }
              
              BackgroundLogger.log('error', 'TEST_GEN', 'Gemini API error', { 
                status: response.status,
                statusText: response.statusText,
                errorText,
                parsedError,
                endpoint,
                hasApiKey: !!apiKey,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'none',
                requestUrl: `${endpoint}?key=${apiKey.substring(0, 12)}...`
              });
              
              let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
              if (parsedError?.error?.message) {
                errorMessage += ` - ${parsedError.error.message}`;
              }
              
              sendResponse({ success: false, error: errorMessage });
              return;
            }
            const data = await response.json();
            
            // Log detailed response for debugging
            BackgroundLogger.log('debug', 'TEST_GEN', 'API Response data', {
              candidates: data.candidates?.length || 0,
              finishReason: data.candidates?.[0]?.finishReason,
              textLength: data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0
            });
            
            const generated = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const finishReason = data.candidates?.[0]?.finishReason;
            
            if (generated && generated.trim().length > 0) {
              // Even if finishReason is MAX_TOKENS, if we have content, it's likely usable
              if (finishReason === 'MAX_TOKENS') {
                BackgroundLogger.log('warning', 'TEST_GEN', 'Response was truncated due to token limit, but content was generated');
              }
              BackgroundLogger.log('success', 'TEST_GEN', 'Test generated with Gemini', {
                length: generated.length,
                finishReason: finishReason
              });
              sendResponse({ success: true, test: generated });
            } else {
              BackgroundLogger.log('error', 'TEST_GEN', 'Gemini API did not generate any test', {
                finishReason: finishReason,
                candidatesLength: data.candidates?.length || 0,
                fullResponse: data
              });
              sendResponse({ success: false, error: 'La IA no generó ningún test. Revisa las instrucciones o intenta nuevamente.' });
            }
          } catch (err) {
            BackgroundLogger.log('error', 'TEST_GEN', 'Failed to call Gemini API', err);
            sendResponse({ success: false, error: err.message });
          }
        });
      } catch (error) {
        BackgroundLogger.log('error', 'TEST_GEN', 'Failed to generate test', error);
        sendResponse({ success: false, error: error.message });
      }
      return true; // Mantener canal abierto para respuesta async
      
    case 'testGeminiAPI':
      BackgroundLogger.log('info', 'TEST_API', 'Direct Gemini API test requested');
      
      chrome.storage.local.get(['aiModels'], async (result) => {
        try {
          const flowAuto = (result.aiModels && result.aiModels['flow-auto']) || {};
          const endpoint = flowAuto.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
          const apiKey = flowAuto.apiKey || '';
          
          BackgroundLogger.log('debug', 'TEST_API', 'Testing with config', { 
            endpoint, 
            hasApiKey: !!apiKey,
            apiKeyLength: apiKey ? apiKey.length : 0,
            apiKeyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'none'
          });
          
          if (!apiKey || apiKey.trim() === '') {
            BackgroundLogger.log('error', 'TEST_API', 'No API key configured');
            sendResponse({ success: false, error: 'API Key not configured' });
            return;
          }
          
          const testPayload = {
            contents: [{ parts: [{ text: 'Test connection - respond with only "API_OK"' }] }],
            generationConfig: { maxOutputTokens: 10, temperature: 0 }
          };
          
          BackgroundLogger.log('debug', 'TEST_API', 'Making test request', {
            url: `${endpoint}?key=${apiKey.substring(0, 12)}...`,
            payload: testPayload
          });
          
          const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPayload)
          });
          
          BackgroundLogger.log('debug', 'TEST_API', 'Response received', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            let parsedError = null;
            try {
              parsedError = JSON.parse(errorText);
            } catch (e) {
              // Error text is not JSON
            }
            
            BackgroundLogger.log('error', 'TEST_API', 'API test failed', { 
              status: response.status,
              statusText: response.statusText,
              errorText,
              parsedError
            });
            
            sendResponse({ 
              success: false, 
              error: `API test failed: ${response.status} ${response.statusText}`,
              details: parsedError || errorText
            });
            return;
          }
          
          const data = await response.json();
          BackgroundLogger.log('success', 'TEST_API', 'API test successful', data);
          sendResponse({ success: true, data, message: 'Gemini API working correctly' });
          
        } catch (error) {
          BackgroundLogger.log('error', 'TEST_API', 'API test error', error);
          sendResponse({ success: false, error: error.message });
        }
      });
      return true;
      
    case 'exportPlaywright':
      BackgroundLogger.log('info', 'EXPORT', 'Export Playwright requested from popup');
      
      try {
        if (!request.actions || request.actions.length === 0) {
          sendResponse({ success: false, error: 'No actions to export' });
          break;
        }
        
        const playwrightCode = generatePlaywrightTest(request.actions);
        
        // Crear y descargar archivo
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (code) => {
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `playwright-test-${Date.now()}.spec.js`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              },
              args: [playwrightCode]
            });
          }
        });
        
        BackgroundLogger.log('success', 'EXPORT', 'Playwright test exported successfully');
        sendResponse({ success: true });
      } catch (error) {
        BackgroundLogger.log('error', 'EXPORT', 'Failed to export Playwright test', error);
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'pageRestrictions':
      BackgroundLogger.log('warning', 'PAGE_RESTRICTIONS', 'Page compatibility issues reported', {
        restrictions: request.restrictions,
        url: request.restrictions?.url || 'unknown',
        reason: request.restrictions?.reason || 'unknown'
      });
      
      // Notificar al popup si está abierto
      chrome.runtime.sendMessage({
        action: 'pageRestrictionsWarning',
        restrictions: request.restrictions
      }).catch(() => {
        // Popup might not be open
      });
      
      sendResponse({ success: true });
      break;

    case 'testGeminiAPI':
      BackgroundLogger.log('info', 'GEMINI_TEST', 'Testing Gemini API connection', {
        endpoint: request.endpoint,
        hasApiKey: !!request.apiKey
      });
      
      fetch(request.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': request.apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test connection - responde solo con "OK"' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0
          }
        })
      }).then(response => {
        BackgroundLogger.log('info', 'GEMINI_TEST', 'Gemini API response received', {
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          return response.text().then(errorText => {
            BackgroundLogger.log('error', 'GEMINI_TEST', 'Gemini API error', { 
              status: response.status, 
              error: errorText 
            });
            sendResponse({ 
              success: false, 
              error: `HTTP ${response.status}: ${response.statusText}`,
              details: errorText
            });
          });
        }
        
        return response.json().then(data => {
          BackgroundLogger.log('success', 'GEMINI_TEST', 'Gemini API test successful', data);
          
          // Verificar que la respuesta tenga la estructura esperada
          if (data.candidates && data.candidates.length > 0) {
            sendResponse({ 
              success: true, 
              message: 'Conexión exitosa con Gemini Pro',
              response: data
            });
          } else {
            sendResponse({ 
              success: false, 
              error: 'Respuesta inesperada de Gemini',
              response: data
            });
          }
        });
      }).catch(error => {
        BackgroundLogger.log('error', 'GEMINI_TEST', 'Failed to test Gemini API', error);
        
        let errorMessage = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Error de red - verifica tu conexión a internet';
        }
        
        sendResponse({ success: false, error: errorMessage });
      });
      
      return true; // Keep message channel open for async response
      
    default:
      BackgroundLogger.log('warning', 'MESSAGE_HANDLER', 'Unknown action received', {
        action: request.action,
        sender: senderInfo
      });
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Navegación entre páginas - mantener estado de grabación
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    BackgroundLogger.log('info', 'NAVIGATION', 'Page navigation completed', {
      tabId: details.tabId,
      url: details.url,
      timestamp: details.timeStamp
    });
    
    if (!isValidUrl(details.url)) {
      BackgroundLogger.log('warning', 'NAVIGATION', 'Skipping script injection for restricted URL', {
        tabId: details.tabId,
        url: details.url
      });
      return;
    }
    
    chrome.storage.local.get(['sessionData'], (result) => {
      if (chrome.runtime.lastError) {
        BackgroundLogger.log('error', 'NAVIGATION', 'Failed to get session data', chrome.runtime.lastError);
        return;
      }
      
      if (result.sessionData && result.sessionData.isRecording) {
        BackgroundLogger.log('info', 'NAVIGATION', 'Recording session active, injecting script', {
          tabId: details.tabId,
          sessionId: result.sessionData.sessionId
        });
        
        setTimeout(() => {
          safeScriptInjection(details.tabId, (tab) => {
            chrome.scripting.executeScript({
              target: { tabId: details.tabId },
              files: ['src/content-enhanced.js']
            }).then(() => {
              BackgroundLogger.log('success', 'NAVIGATION', 'Content script injected on navigation', {
                tabId: details.tabId,
                url: tab.url
              });
            }).catch(err => {
              BackgroundLogger.log('error', 'NAVIGATION', 'Script injection failed on navigation', {
                tabId: details.tabId,
                error: err.message
              });
            });
          });
        }, 500);
      } else {
        BackgroundLogger.log('debug', 'NAVIGATION', 'No active recording session, skipping injection');
      }
    });
  }
});

// Context menu handlers
chrome.contextMenus.onClicked.addListener((info, tab) => {
  BackgroundLogger.log('info', 'CONTEXT_MENU', 'Context menu item clicked', {
    menuItemId: info.menuItemId,
    tabId: tab.id,
    url: tab.url
  });
  
  if (!isValidUrl(tab.url)) {
    BackgroundLogger.log('warning', 'CONTEXT_MENU', 'Cannot execute context menu action on restricted URL', {
      tabId: tab.id,
      url: tab.url
    });
    return;
  }
  
  switch (info.menuItemId) {
    case 'testbuilder-start':
      BackgroundLogger.log('info', 'CONTEXT_MENU', 'Starting TestBuilder via context menu');
      safeScriptInjection(tab.id, (validTab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            if (window.testBuilderPro) {
              window.testBuilderPro.startRecording();
              return { success: true, message: 'Recording started via context menu' };
            } else {
              return { success: false, message: 'TestBuilder not found on page' };
            }
          }
        }).then(results => {
          BackgroundLogger.log('success', 'CONTEXT_MENU', 'Context menu start recording executed', results);
        }).catch(err => {
          BackgroundLogger.log('error', 'CONTEXT_MENU', 'Context menu execution failed', err);
        });
      });
      break;
      
    case 'testbuilder-generate':
      BackgroundLogger.log('info', 'CONTEXT_MENU', 'Generating test via context menu');
      safeScriptInjection(tab.id, (validTab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            if (window.testBuilderPro) {
              const testCode = window.testBuilderPro.generatePlaywrightTest();
              return { success: true, message: 'Test generated', testCode };
            } else {
              return { success: false, message: 'TestBuilder not found on page' };
            }
          }
        }).then(results => {
          BackgroundLogger.log('success', 'CONTEXT_MENU', 'Context menu test generation executed', results);
        }).catch(err => {
          BackgroundLogger.log('error', 'CONTEXT_MENU', 'Context menu generation failed', err);
        });
      });
      break;
      
    default:
      BackgroundLogger.log('warning', 'CONTEXT_MENU', 'Unknown context menu item', info.menuItemId);
  }
});

// Error handlers globales para background
self.addEventListener('error', (event) => {
  BackgroundLogger.log('error', 'GLOBAL_ERROR', 'Unhandled error in background script', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    error: event.error
  });
});

self.addEventListener('unhandledrejection', (event) => {
  BackgroundLogger.log('error', 'GLOBAL_ERROR', 'Unhandled promise rejection in background script', {
    reason: event.reason
  });
});

BackgroundLogger.log('success', 'BACKGROUND', 'TestBuilder Background Script Ready with Debug Logging!');

// Variable para controlar que los menús solo se configuren una vez
let menusInitialized = false;

// Función para inicializar menús una sola vez
function initializeMenusOnce() {
  if (menusInitialized) {
    BackgroundLogger.log('info', 'MENU_SETUP', 'Menus already initialized, skipping');
    return;
  }
  
  menusInitialized = true;
  BackgroundLogger.log('info', 'MENU_SETUP', 'Initializing menus for the first time');
  setupContextMenus();
}

// Configurar menús solo en instalación/actualización
chrome.runtime.onStartup.addListener(() => {
  BackgroundLogger.log('info', 'STARTUP', 'Extension startup detected');
  initializeMenusOnce();
});

// Inicializar menús al cargar el script (solo una vez)
initializeMenusOnce();

// Función para generar código de Playwright
function generatePlaywrightTest(actions) {
  if (!actions || actions.length === 0) return '';
  
  const url = actions[0]?.url || 'https://example.com';
  const title = 'Generated Test';
  
  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `test('${title}', async ({ page }) => {\n`;
  code += `  await page.goto('${url}');\n\n`;
  
  actions.forEach((action, index) => {
    switch (action.type) {
      case 'click':
      case 'button_click':
        code += `  await page.click('${action.selector}');\n`;
        break;
      case 'navigation':
        if (action.href) {
          code += `  await page.click('${action.selector}'); // Navigate to ${action.href}\n`;
        }
        break;
      case 'input':
        code += `  await page.fill('${action.selector}', '${action.value || ''}');\n`;
        break;
      case 'keydown':
        if (action.key === 'Enter') {
          code += `  await page.press('${action.selector}', 'Enter');\n`;
        }
        break;
      case 'submit':
        code += `  await page.click('${action.selector} [type="submit"]');\n`;
        break;
    }
    
    // Add wait after each action for stability
    if (index < actions.length - 1) {
      code += `  await page.waitForTimeout(500);\n`;
    }
  });
  
  code += `\n  // Add assertions here\n`;
  code += `  // await expect(page).toHaveTitle(/expected title/i);\n`;
  code += `});\n`;
  
  return code;
}

// Función para validar URLs permitidas
function isValidUrl(url) {
  if (!url) return false;
  
  const restrictedPatterns = [
    /^chrome:/,
    /^chrome-extension:/,
    /^moz-extension:/,
    /^ms-browser-extension:/,
    /^about:/,
    /^file:/
  ];
  
  return !restrictedPatterns.some(pattern => pattern.test(url));
}

// Función segura para inyectar scripts
function safeScriptInjection(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn(' Error accessing tab:', chrome.runtime.lastError.message);
      return;
    }
    
    if (!isValidUrl(tab.url)) {
      console.warn(' Cannot inject into restricted URL:', tab.url);
      return;
    }
    
    callback(tab);
  });
}

BackgroundLogger.log('success', 'BACKGROUND', 'TestBuilder Background Script Ready!');
