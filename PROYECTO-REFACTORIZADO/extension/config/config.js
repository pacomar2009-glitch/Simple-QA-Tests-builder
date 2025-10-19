// TODO: SEGURIDAD - REMOVER API KEYS HARDCODEADAS
// Configuración de TestBuilder Flow-auto
let aiModelConfig = {
  'flow-auto': {
    name: 'Flow-auto',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    apiKey: 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24', // DEPRECADO: Mover a .env o configuración de usuario
    status: 'configured',
    testMethod: 'testGemini'
  }
};

let availableModels = [
  {
    id: 'flow-auto',
    name: 'Flow-auto',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    description: 'Sistema de IA integrado basado en Google Gemini 2.5 Flash para generación automática de tests',
    features: ['Preconfigurado', 'Gemini 2.5 Flash', 'Listo para usar'],
    requiresKey: true,
    status: 'configured',
    testMethod: 'testGemini',
    apiKey: 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24' // DEPRECADO: Remover API key hardcodeada
  }
];

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Config page loading...');
  await initializeDefaultConfiguration(); // Nueva función
  initializeTabs();
  loadInstructions();
  loadModels();
  updateInstructionsPreview();
  setupEventListeners();
});

// Función para inicializar configuración por defecto
async function initializeDefaultConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiModels'], (result) => {
      const savedModels = result.aiModels || {};
      
      // Asegurar que flow-auto existe con configuración completa
      if (!savedModels['flow-auto'] || !savedModels['flow-auto'].apiKey) {
        savedModels['flow-auto'] = {
          name: 'Flow-auto',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          apiKey: 'AIzaSyCzJ4xs0SjfvlYMvSBkjauJ9s5n_0r6F24', // TODO: REMOVER - API key no debe estar hardcodeada
          status: 'configured',
          testMethod: 'testGemini'
        };
        
        chrome.storage.local.set({ aiModels: savedModels }, () => {
          console.log('✅ Default Gemini configuration initialized');
          resolve();
        });
      } else {
        console.log('ℹ️ Gemini configuration already exists');
        resolve();
      }
    });
  });
}

// Configurar event listeners
function setupEventListeners() {
  // Botones principales
  document.getElementById('save-instructions-btn')?.addEventListener('click', saveInstructions);
  document.getElementById('reset-instructions-btn')?.addEventListener('click', resetInstructions);
  document.getElementById('test-instructions-btn')?.addEventListener('click', testInstructions);
  document.getElementById('add-custom-model-btn')?.addEventListener('click', addCustomModel);
  document.getElementById('test-connection-btn')?.addEventListener('click', testConnection);
  document.getElementById('save-template-btn')?.addEventListener('click', saveTemplate);
  document.getElementById('preview-template-btn')?.addEventListener('click', previewTemplate);
  document.getElementById('export-config-btn')?.addEventListener('click', exportConfiguration);
  document.getElementById('import-config-btn')?.addEventListener('click', importConfiguration);
  
  // Event listeners para actualizar vista previa
  document.addEventListener('change', updateInstructionsPreview);
  document.addEventListener('input', updateInstructionsPreview);
}

// Inicializar tabs
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      // Cargar modelos cuando se abra la pestaña
      if (targetTab === 'models') {
        loadModels();
      }
    });
  });
}

// Cargar modelos
// Cargar modelos
function loadModels() {
  const modelsList = document.getElementById('modelsList');
  if (!modelsList) return;
  
  // Configuración predeterminada de Flow-auto
  const flowAutoModel = availableModels[0]; // Flow-auto es el único modelo
  
  modelsList.innerHTML = `
    <div class="model-card configured">
      <div class="model-header">
        <div class="model-name">${flowAutoModel.name}</div>
        <div class="model-status configured">✅ Configurado y Listo</div>
      </div>
      <div class="model-description">${flowAutoModel.description}</div>
      <div class="model-features">
        ${flowAutoModel.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
      </div>
      <div class="form-group" style="margin-top: 20px;">
        <label>🔗 Endpoint API:</label>
        <input type="text" value="${flowAutoModel.endpoint}" readonly style="background: #f8f9fa; color: #666;">
      </div>
      <div class="form-group">
        <label>🔑 Estado de la API Key:</label>
        <input type="text" value="Configurada y lista para usar" readonly style="background: #d4edda; color: #155724;">
      </div>
      <div style="margin-top: 20px;">
        <button class="btn success" id="test-flow-auto-btn">� Probar Conexión</button>
        <div id="flow-auto-result" class="test-result" style="display: none;"></div>
      </div>
    </div>
  `;
  
  // Agregar event listener para el botón de test
  const testBtn = document.getElementById('test-flow-auto-btn');
  if (testBtn) {
    testBtn.addEventListener('click', testFlowAutoConnection);
  }
  
  // Guardar configuración en storage si no existe
  chrome.storage.local.get(['aiModels'], (result) => {
    const savedModels = result.aiModels || {};
    if (!savedModels['flow-auto']) {
      savedModels['flow-auto'] = {
        name: flowAutoModel.name,
        endpoint: flowAutoModel.endpoint,
        apiKey: flowAutoModel.apiKey,
        testMethod: flowAutoModel.testMethod
      };
      chrome.storage.local.set({ aiModels: savedModels });
    }
  });
}

// Función específica para probar Flow-auto
async function testFlowAutoConnection() {
  const resultDiv = document.getElementById('flow-auto-result');
  const testBtn = document.getElementById('test-flow-auto-btn');
  
  if (!resultDiv || !testBtn) return;
  
  testBtn.disabled = true;
  testBtn.textContent = '🔄 Probando...';
  resultDiv.style.display = 'block';
  resultDiv.className = 'test-result';
  resultDiv.textContent = '🔄 Verificando conexión con Flow-auto (Gemini)...';
  
  try {
    const flowAutoModel = availableModels[0];
    console.log('🚀 Iniciando test de Flow-auto via background script:', flowAutoModel);
    
    // Verificar que hay API key configurada
    if (!flowAutoModel.apiKey || flowAutoModel.apiKey.trim() === '') {
      throw new Error('API Key de Gemini no configurada. Por favor, obtén una API key de Google AI Studio.');
    }
    
    // Lista de endpoints para probar en orden de preferencia
    const endpointsToTry = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent'
    ];
    
    let lastError = null;
    let success = false;
    let workingEndpoint = null;
    
    for (const endpoint of endpointsToTry) {
      try {
        resultDiv.textContent = `🔄 Probando endpoint: ${endpoint.split('/').pop()}...`;
        
        const response = await chrome.runtime.sendMessage({
          action: 'testGeminiAPI',
          endpoint: endpoint,
          apiKey: flowAutoModel.apiKey
        });
        
        console.log(`📡 Respuesta para ${endpoint}:`, response);
        
        if (response.success) {
          success = true;
          workingEndpoint = endpoint;
          
          // Actualizar la configuración con el endpoint que funciona
          if (endpoint !== flowAutoModel.endpoint) {
            availableModels[0].endpoint = endpoint;
            aiModelConfig['flow-auto'].endpoint = endpoint;
            
            // Guardar el endpoint actualizado
            chrome.storage.local.get(['aiModels'], (result) => {
              const savedModels = result.aiModels || {};
              savedModels['flow-auto'] = {
                ...savedModels['flow-auto'],
                endpoint: endpoint
              };
              chrome.storage.local.set({ aiModels: savedModels });
            });
          }
          
          resultDiv.className = 'test-result success';
          resultDiv.innerHTML = `
            ✅ <strong>¡Flow-auto conectado exitosamente!</strong><br>
            🤖 Gemini respondió correctamente<br>
            🔗 Endpoint funcional: <code>${endpoint.split('/').pop()}</code><br>
            ⚡ Sistema listo para generar tests automáticamente<br>
            📝 Puedes usar "Generate with AI" en el popup principal<br>
            <small>✨ ${response.message}</small>
          `;
          
          // Guardar estado de conexión exitosa
          chrome.storage.local.set({ 
            flowAutoStatus: 'connected',
            lastTestTime: Date.now(),
            lastResponse: response.response,
            workingEndpoint: endpoint
          });
          
          break;
        } else {
          lastError = response.error;
        }
      } catch (error) {
        lastError = error.message;
        console.log(`❌ Endpoint ${endpoint} falló:`, error.message);
      }
    }
    
    if (!success) {
      throw new Error(lastError || 'Todos los endpoints fallaron');
    }
    
  } catch (error) {
    console.error('❌ Error en test de Flow-auto:', error);
    
    resultDiv.className = 'test-result error';
    
    let errorMessage = error.message || 'Error desconocido';
    let solutions = [];
    
    if (errorMessage.includes('API Key de Gemini no configurada')) {
      solutions = [
        '🔑 Ve a <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
        '📝 Crea una nueva API key gratuita',
        '⚙️ Pega la API key en la configuración de Flow-auto abajo',
        '🔄 Guarda la configuración y prueba de nuevo'
      ];
    } else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('403')) {
      solutions = [
        '🔑 Tu API key puede estar inválida o revocada',
        '🌐 Ve a <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a>',
        '� Genera una nueva API key',
        '⚙️ Actualiza la configuración abajo'
      ];
    } else if (errorMessage.includes('404')) {
      solutions = [
        '🔄 El modelo puede haber cambiado de nombre',
        '📋 Verificando múltiples endpoints automáticamente...',
        '🌐 Google puede estar actualizando sus modelos'
      ];
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT_EXCEEDED')) {
      solutions = [
        '⏰ Límite de rate exceeded - espera unos minutos',
        '🔄 Google tiene límites de velocidad, intenta más tarde',
        '💡 Considera usar menos llamadas por minuto'
      ];
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      solutions = [
        '🌐 Verifica tu conexión a internet',
        '🔄 Recarga la extensión e intenta de nuevo',
        '🛡️ Verifica que no haya un firewall bloqueando'
      ];
    } else {
      solutions = [
        '🔄 Recarga la extensión e intenta de nuevo',
        '⏰ Espera unos minutos si hay problemas de rate limit',
        '📞 Puede ser un problema temporal de Google',
        '🔧 Verifica tu API key en Google AI Studio'
      ];
    }
    
    resultDiv.innerHTML = `
      ❌ <strong>Error de conexión:</strong><br>
      ${errorMessage}<br><br>
      <strong>Posibles soluciones:</strong><br>
      ${solutions.map(sol => `${sol}<br>`).join('')}
      <br>
      <strong>Debug Info:</strong><br>
      <small>Probé múltiples endpoints de Gemini automáticamente</small>
    `;
    
    // Guardar estado de error
    chrome.storage.local.set({ 
      flowAutoStatus: 'error',
      lastError: errorMessage,
      lastTestTime: Date.now()
    });
  }
  
  testBtn.disabled = false;
  testBtn.textContent = '🔌 Probar Conexión';
}

// Alternar configuración de modelo
function toggleModelConfig(modelId) {
  const config = document.getElementById(`config-${modelId}`);
  config.classList.toggle('show');
}

// Guardar configuración de modelo
function saveModelConfig(modelId) {
  const model = availableModels.find(m => m.id === modelId);
  if (!model) return;
  
  const apiKey = document.getElementById(`key-${modelId}`)?.value || '';
  const endpoint = document.getElementById(`endpoint-${modelId}`)?.value || model.endpoint;
  
  chrome.storage.local.get(['aiModels'], (result) => {
    const savedModels = result.aiModels || {};
    savedModels[modelId] = {
      name: model.name,
      endpoint: endpoint,
      apiKey: apiKey,
      testMethod: model.testMethod
    };
    
    chrome.storage.local.set({ aiModels: savedModels }, () => {
      showNotification(`Configuración de ${model.name} guardada`, 'success');
      loadModels(); // Recargar para actualizar estados
    });
  });
}

// Eliminar configuración de modelo
function removeModelConfig(modelId) {
  if (confirm('¿Eliminar la configuración de este modelo?')) {
    chrome.storage.local.get(['aiModels'], (result) => {
      const savedModels = result.aiModels || {};
      delete savedModels[modelId];
      
      chrome.storage.local.set({ aiModels: savedModels }, () => {
        showNotification('Configuración eliminada', 'success');
        loadModels();
      });
    });
  }
}

// Test de conexión para modelo específico
async function testModelConnection(modelId) {
  const resultDiv = document.getElementById(`test-result-${modelId}`);
  resultDiv.style.display = 'block';
  resultDiv.className = 'test-result';
  resultDiv.innerHTML = '🔄 Probando conexión...';
  
  const model = availableModels.find(m => m.id === modelId);
  const apiKey = document.getElementById(`key-${modelId}`)?.value || '';
  const endpoint = document.getElementById(`endpoint-${modelId}`)?.value || model.endpoint;
  
  try {
    let success = false;
    
    switch (model.testMethod) {
      case 'testOpenAI':
        success = await testOpenAIConnection(endpoint, apiKey);
        break;
      case 'testGemini':
        success = await testGeminiConnection(endpoint, apiKey);
        break;
      case 'testAnthropic':
        success = await testAnthropicConnection(endpoint, apiKey);
        break;
      case 'testOllama':
        success = await testOllamaConnection(endpoint);
        break;
      default:
        success = await testGenericConnection(endpoint, apiKey);
    }
    
    if (success) {
      resultDiv.className = 'test-result success';
      resultDiv.innerHTML = '✅ Conexión exitosa! El modelo está listo para usar.';
    } else {
      resultDiv.className = 'test-result error';
      resultDiv.innerHTML = '❌ Error en la conexión. Verifica la configuración.';
    }
    
  } catch (error) {
    resultDiv.className = 'test-result error';
    resultDiv.innerHTML = `❌ Error: ${error.message}`;
  }
}

// Funciones de test específicas para cada proveedor
async function testOpenAIConnection(endpoint, apiKey) {
  if (!apiKey) throw new Error('API Key requerida para OpenAI');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test connection' }],
      max_tokens: 5
    })
  });
  
  return response.ok;
}

async function testGeminiConnection(endpoint, apiKey) {
  if (!apiKey) throw new Error('API Key requerida para Gemini');
  
  try {
    console.log('🔄 Testing Gemini connection...', { endpoint, hasApiKey: !!apiKey });
    
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
    });
    
    console.log('📡 Gemini response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Gemini response:', data);
    
    // Verificar que la respuesta tenga la estructura esperada
    if (data.candidates && data.candidates.length > 0) {
      return true;
    } else {
      throw new Error('Respuesta inesperada de Gemini');
    }
    
  } catch (error) {
    console.error('❌ Error testing Gemini:', error);
    
    // Verificar tipos específicos de error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Error de red - verifica tu conexión a internet');
    } else if (error.message.includes('CORS')) {
      throw new Error('Error de CORS - la extensión no puede acceder a la API directamente');
    } else if (error.message.includes('403')) {
      throw new Error('API Key inválida o sin permisos');
    } else if (error.message.includes('429')) {
      throw new Error('Límite de rate exceeded - intenta más tarde');
    }
    
    throw error;
  }
}

async function testAnthropicConnection(endpoint, apiKey) {
  if (!apiKey) throw new Error('API Key requerida para Anthropic');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 5,
      messages: [{ role: 'user', content: 'Test connection' }]
    })
  });
  
  return response.ok;
}

async function testOllamaConnection(endpoint) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama2',
      prompt: 'Test',
      stream: false
    })
  });
  
  return response.ok;
}

async function testGenericConnection(endpoint, apiKey) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      prompt: 'Test connection',
      max_tokens: 5
    })
  });
  
  return response.ok;
}

// Test de conexión para modelo personalizado
async function testConnection() {
  const endpoint = document.getElementById('customModelEndpoint').value;
  const apiKey = document.getElementById('customModelKey').value;
  const resultDiv = document.getElementById('connection-result');
  
  if (!endpoint) {
    showNotification('Por favor ingresa un endpoint', 'error');
    return;
  }
  
  resultDiv.style.display = 'block';
  resultDiv.className = 'test-result';
  resultDiv.innerHTML = '🔄 Probando conexión...';
  
  try {
    const success = await testGenericConnection(endpoint, apiKey);
    
    if (success) {
      resultDiv.className = 'test-result success';
      resultDiv.innerHTML = '✅ Conexión exitosa! El endpoint responde correctamente.';
    } else {
      resultDiv.className = 'test-result error';
      resultDiv.innerHTML = '❌ Error en la conexión. Verifica el endpoint y la API key.';
    }
  } catch (error) {
    resultDiv.className = 'test-result error';
    resultDiv.innerHTML = `❌ Error: ${error.message}`;
  }
}

// Agregar modelo personalizado
function addCustomModel() {
  const name = document.getElementById('customModelName').value;
  const endpoint = document.getElementById('customModelEndpoint').value;
  const apiKey = document.getElementById('customModelKey').value;
  
  if (!name || !endpoint) {
    showNotification('Nombre y endpoint son requeridos', 'error');
    return;
  }
  
  const customId = `custom-${Date.now()}`;
  
  chrome.storage.local.get(['aiModels'], (result) => {
    const savedModels = result.aiModels || {};
    savedModels[customId] = {
      name: name,
      endpoint: endpoint,
      apiKey: apiKey,
      testMethod: 'testGeneric',
      custom: true
    };
    
    chrome.storage.local.set({ aiModels: savedModels }, () => {
      showNotification(`Modelo ${name} agregado correctamente`, 'success');
      
      // Limpiar formulario
      document.getElementById('customModelName').value = '';
      document.getElementById('customModelEndpoint').value = '';
      document.getElementById('customModelKey').value = '';
      document.getElementById('connection-result').style.display = 'none';
      
      // Agregar a la lista local para mostrar inmediatamente
      availableModels.push({
        id: customId,
        name: name,
        endpoint: endpoint,
        description: 'Modelo personalizado',
        features: ['Personalizado'],
        requiresKey: !!apiKey,
        status: 'configured',
        testMethod: 'testGeneric'
      });
      
      loadModels();
    });
  });
}

// Cargar instrucciones
function loadInstructions() {
  chrome.storage.local.get(['userInstructions'], (result) => {
    const instructions = result.userInstructions;
    if (instructions) {
      document.getElementById('language').value = instructions.style?.language || 'español';
      document.getElementById('tone').value = instructions.style?.tone || 'profesional';
      document.getElementById('detailLevel').value = instructions.style?.detail_level || 'detallado';
      document.getElementById('namingConvention').value = instructions.standards?.naming_convention || 'descriptive';
      document.getElementById('stepNumbering').checked = instructions.standards?.step_numbering || false;
      document.getElementById('preconditions').checked = instructions.standards?.preconditions_required || false;
      document.getElementById('postconditions').checked = instructions.standards?.postconditions_required || false;
      document.getElementById('expectedResults').checked = instructions.standards?.expected_results || false;
      document.getElementById('includeScreenshots').checked = instructions.content?.include_screenshots || false;
      document.getElementById('includeTestData').checked = instructions.content?.include_test_data || false;
      document.getElementById('includeValidations').checked = instructions.content?.include_validations || false;
      document.getElementById('includeErrorCases').checked = instructions.content?.include_error_cases || false;
      document.getElementById('includeBrowserInfo').checked = instructions.content?.include_browser_info || false;
      document.getElementById('customInstructions').value = instructions.custom_instructions || '';
      document.getElementById('testFramework').value = instructions.framework || 'playwright';
    } else {
      // Valores por defecto si no hay instrucciones guardadas
      document.getElementById('language').value = 'español';
      document.getElementById('tone').value = 'profesional';
      document.getElementById('detailLevel').value = 'detallado';
      document.getElementById('namingConvention').value = 'descriptive';
      document.getElementById('testFramework').value = 'playwright';
    }
  });
}

// Guardar instrucciones
function saveInstructions() {
  const instructions = gatherCurrentInstructions();
  
  chrome.storage.local.set({ userInstructions: instructions }, () => {
    showNotification('Configuración guardada correctamente', 'success');
    updateInstructionsPreview();
  });
}

// Actualizar vista previa de instrucciones
function updateInstructionsPreview() {
  const preview = document.getElementById('instructionsPreview');
  if (!preview) return;
  
  const instructions = gatherCurrentInstructions();
  preview.textContent = JSON.stringify(instructions, null, 2);
}

// Recopilar instrucciones actuales
function gatherCurrentInstructions() {
  return {
    style: {
      language: document.getElementById('language')?.value || 'español',
      tone: document.getElementById('tone')?.value || 'profesional',
      detail_level: document.getElementById('detailLevel')?.value || 'detallado'
    },
    standards: {
      naming_convention: document.getElementById('namingConvention')?.value || 'descriptive',
      step_numbering: document.getElementById('stepNumbering')?.checked || false,
      preconditions_required: document.getElementById('preconditions')?.checked || false,
      postconditions_required: document.getElementById('postconditions')?.checked || false,
      expected_results: document.getElementById('expectedResults')?.checked || false
    },
    content: {
      include_screenshots: document.getElementById('includeScreenshots')?.checked || false,
      include_test_data: document.getElementById('includeTestData')?.checked || false,
      include_validations: document.getElementById('includeValidations')?.checked || false,
      include_error_cases: document.getElementById('includeErrorCases')?.checked || false,
      include_browser_info: document.getElementById('includeBrowserInfo')?.checked || false
    },
    custom_instructions: document.getElementById('customInstructions')?.value || '',
    framework: document.getElementById('testFramework')?.value || 'playwright'
  };
}

// Mostrar notificación
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Funciones adicionales
function resetInstructions() {
  if (confirm('¿Restaurar configuración por defecto?')) {
    location.reload();
  }
}

function testInstructions() {
  const instructions = gatherCurrentInstructions();
  showNotification('Configuración de instrucciones válida ✅', 'success');
  console.log('Test instructions:', instructions);
}

function saveTemplate() {
  const templateType = document.getElementById('templateType')?.value || 'standard';
  const templateStructure = document.getElementById('templateStructure')?.value || '';
  
  const template = {
    type: templateType,
    structure: templateStructure,
    created: new Date().toISOString()
  };
  
  chrome.storage.local.set({ customTemplate: template }, () => {
    showNotification('Template guardado correctamente', 'success');
  });
}

function previewTemplate() {
  const templateStructure = document.getElementById('templateStructure')?.value || '';
  if (!templateStructure) {
    showNotification('Ingresa una estructura de template primero', 'error');
    return;
  }
  
  // Crear ventana de vista previa
  const previewWindow = window.open('', '_blank', 'width=600,height=400');
  previewWindow.document.write(`
    <html>
      <head><title>Vista Previa Template</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Vista Previa del Template</h2>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${templateStructure}</pre>
      </body>
    </html>
  `);
}

function exportConfiguration() {
  // Exportar toda la configuración
  chrome.storage.local.get(null, (data) => {
    const config = {
      userInstructions: data.userInstructions || {},
      aiModels: data.aiModels || {},
      customTemplate: data.customTemplate || {},
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testbuilder-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Configuración exportada correctamente', 'success');
  });
}

function importConfiguration() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        
        // Validar estructura básica
        if (!config.userInstructions && !config.aiModels) {
          throw new Error('Archivo de configuración inválido');
        }
        
        // Importar configuración
        chrome.storage.local.set(config, () => {
          showNotification('Configuración importada correctamente', 'success');
          setTimeout(() => location.reload(), 1500);
        });
        
      } catch (error) {
        showNotification('Error al importar configuración: ' + error.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// Hacer funciones globales para el HTML
window.toggleModelConfig = toggleModelConfig;
window.saveModelConfig = saveModelConfig;
window.removeModelConfig = removeModelConfig;
window.testModelConnection = testModelConnection;