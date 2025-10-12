// Configuración de TestBuilder
let aiModelConfig = {};
let availableModels = [
  {
    id: 'openai-gpt4',
    name: 'OpenAI GPT-4',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    description: 'Modelo más avanzado de OpenAI, excelente para generación de tests complejos',
    features: ['Multimodal', 'Código', 'Razonamiento'],
    requiresKey: true,
    status: 'requires-setup',
    testMethod: 'testOpenAI'
  },
  {
    id: 'openai-gpt35',
    name: 'OpenAI GPT-3.5 Turbo',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    description: 'Modelo rápido y eficiente de OpenAI, ideal para pruebas básicas',
    features: ['Rápido', 'Eficiente', 'Código'],
    requiresKey: true,
    status: 'requires-setup',
    testMethod: 'testOpenAI'
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini Pro',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    description: 'Modelo multimodal de Google, gratuito con límites generosos',
    features: ['Multimodal', 'Gratuito', 'Rápido'],
    requiresKey: true,
    status: 'requires-setup',
    testMethod: 'testGemini'
  },
  {
    id: 'anthropic-claude',
    name: 'Anthropic Claude 3.5 Sonnet',
    endpoint: 'https://api.anthropic.com/v1/messages',
    description: 'Modelo de Anthropic, excelente para razonamiento y análisis detallado',
    features: ['Razonamiento', 'Análisis', 'Seguro'],
    requiresKey: true,
    status: 'requires-setup',
    testMethod: 'testAnthropic'
  },
  {
    id: 'ollama-local',
    name: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/api/generate',
    description: 'Modelos locales ejecutados con Ollama, sin necesidad de API key',
    features: ['Local', 'Privacidad', 'Sin costo'],
    requiresKey: false,
    status: 'requires-setup',
    testMethod: 'testOllama'
  }
];

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Config page loading...');
  initializeTabs();
  loadInstructions();
  loadModels();
  updateInstructionsPreview();
  setupEventListeners();
});

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
function loadModels() {
  const modelsList = document.getElementById('modelsList');
  if (!modelsList) return;
  
  // Cargar configuración guardada
  chrome.storage.local.get(['aiModels'], (result) => {
    const savedModels = result.aiModels || {};
    
    modelsList.innerHTML = '';
    
    availableModels.forEach(model => {
      const savedConfig = savedModels[model.id] || {};
      const isConfigured = savedConfig.apiKey || !model.requiresKey;
      
      const modelCard = document.createElement('div');
      modelCard.className = `model-card ${isConfigured ? 'configured' : ''}`;
      modelCard.innerHTML = `
        <div class="model-header">
          <div class="model-name">${model.name}</div>
          <div class="model-status ${isConfigured ? 'configured' : 'requires-setup'}">
            ${isConfigured ? 'Configurado' : 'Requiere configuración'}
          </div>
        </div>
        <div class="model-description">${model.description}</div>
        <div class="model-features">
          ${model.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
        </div>
        <div class="model-config" id="config-${model.id}">
          ${model.requiresKey ? `
            <div class="form-group">
              <label>API Key</label>
              <input type="password" id="key-${model.id}" placeholder="Ingresa tu API key" value="${savedConfig.apiKey || ''}">
            </div>
          ` : ''}
          <div class="form-group">
            <label>Endpoint (opcional)</label>
            <input type="text" id="endpoint-${model.id}" placeholder="${model.endpoint}" value="${savedConfig.endpoint || model.endpoint}">
          </div>
          <div style="margin-top: 15px;">
            <button class="btn success" onclick="saveModelConfig('${model.id}')">💾 Guardar</button>
            <button class="btn" onclick="testModelConnection('${model.id}')">🔌 Test Conexión</button>
            ${isConfigured ? `<button class="btn danger" onclick="removeModelConfig('${model.id}')">🗑️ Eliminar</button>` : ''}
          </div>
          <div id="test-result-${model.id}" class="test-result" style="display: none;"></div>
        </div>
        <button class="btn secondary" onclick="toggleModelConfig('${model.id}')" style="margin-top: 15px;">
          ⚙️ ${isConfigured ? 'Editar' : 'Configurar'}
        </button>
      `;
      
      modelsList.appendChild(modelCard);
    });
  });
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
  
  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: 'Test connection' }]
      }]
    })
  });
  
  return response.ok;
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
  // Valores por defecto
  document.getElementById('language').value = 'español';
  document.getElementById('tone').value = 'profesional';
  document.getElementById('detailLevel').value = 'detallado';
  document.getElementById('namingConvention').value = 'descriptive';
  document.getElementById('testFramework').value = 'playwright';
}

// Guardar instrucciones
function saveInstructions() {
  const instructions = gatherCurrentInstructions();
  
  // Simular guardado
  chrome.storage.local.set({ userInstructions: instructions }, () => {
    showNotification('Configuración guardada correctamente', 'success');
    updateInstructionsPreview();
  });
}

// Actualizar vista previa de instrucciones
function updateInstructionsPreview() {
  const preview = document.getElementById('instructionsPreview');
  const instructions = gatherCurrentInstructions();
  preview.textContent = JSON.stringify(instructions, null, 2);
}

// Recopilar instrucciones actuales
function gatherCurrentInstructions() {
  return {
    style: {
      language: document.getElementById('language').value,
      tone: document.getElementById('tone').value,
      detail_level: document.getElementById('detailLevel').value
    },
    standards: {
      naming_convention: document.getElementById('namingConvention').value,
      step_numbering: document.getElementById('stepNumbering').checked,
      preconditions_required: document.getElementById('preconditions').checked,
      postconditions_required: document.getElementById('postconditions').checked,
      expected_results: document.getElementById('expectedResults').checked
    },
    content: {
      include_screenshots: document.getElementById('includeScreenshots').checked,
      include_test_data: document.getElementById('includeTestData').checked,
      include_validations: document.getElementById('includeValidations').checked,
      include_error_cases: document.getElementById('includeErrorCases').checked,
      include_browser_info: document.getElementById('includeBrowserInfo').checked
    },
    custom_instructions: document.getElementById('customInstructions').value,
    framework: document.getElementById('testFramework').value
  };
// Cargar instrucciones
function loadInstructions() {
  // Valores por defecto
  document.getElementById('language').value = 'español';
  document.getElementById('tone').value = 'profesional';
  document.getElementById('detailLevel').value = 'detallado';
  document.getElementById('namingConvention').value = 'descriptive';
  document.getElementById('testFramework').value = 'playwright';
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
// Fin del archivo
}
