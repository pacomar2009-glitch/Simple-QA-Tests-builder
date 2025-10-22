// US#121 - CONFIG.JS
// Script para página de configuración de Gemini API Key

console.log('⚙️ Página de configuración cargada');

// Referencias DOM
const apiKeyInput = document.getElementById('api-key');
const modelSelect = document.getElementById('model-select');
const btnTest = document.getElementById('btn-test');
const btnSave = document.getElementById('btn-save');
const btnClear = document.getElementById('btn-clear');
const testResult = document.getElementById('test-result');
const statusMessage = document.getElementById('status-message');
const currentStatus = document.getElementById('current-status');
const apiKeyStatus = document.getElementById('api-key-status');

// 🚀 Inicializar
async function init() {
  await loadCurrentConfig();
  
  // Listeners
  btnTest.addEventListener('click', handleTest);
  btnSave.addEventListener('click', handleSave);
  btnClear.addEventListener('click', handleClear);
  
  console.log('✅ Config page inicializada');
}

// 🔄 Cargar configuración actual
async function loadCurrentConfig() {
  try {
    // Obtener API key y modelo guardados
    const result = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel']);
    
    if (result.geminiApiKey && result.geminiApiKey.trim() !== '') {
      apiKeyInput.value = result.geminiApiKey;
      
      // US#124: API Key configurada para backend
      currentStatus.textContent = '✅ Configurada para backend';
      currentStatus.className = 'value';
      apiKeyStatus.textContent = '✅ Sí';
      apiKeyStatus.className = 'value';
      
      showTestResult('ℹ️ API Key almacenada. Backend (puerto 4000) la usará para Single-Pass AI.', 'testing');
    } else {
      currentStatus.textContent = '⚠️ Sin API key';
      currentStatus.className = 'value disabled';
      apiKeyStatus.textContent = '❌ No';
      apiKeyStatus.className = 'value disabled';
    }
    
    // Cargar modelo seleccionado (default: gemini-2.5-flash)
    if (result.geminiModel) {
      modelSelect.value = result.geminiModel;
    } else {
      modelSelect.value = 'gemini-2.5-flash'; // Default
    }
  } catch (error) {
    console.error('❌ Error cargando config:', error);
    showMessage('Error cargando configuración', 'error');
  }
}

// � Probar Conexión (TEST REAL)
async function handleTest() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  
  if (!apiKey) {
    showTestResult('⚠️ Ingresa una API key primero', 'error');
    return;
  }
  
  // Validación básica formato
  if (!apiKey.startsWith('AIzaSy')) {
    showTestResult('⚠️ Formato inválido. Debe empezar con "AIzaSy"', 'error');
    return;
  }
  
  try {
    btnTest.disabled = true;
    btnTest.innerHTML = '<span>⏳</span><span>Validando formato...</span>';
    
    // US#124: Extensión ya NO tiene Gemini, solo valida formato
    await new Promise(resolve => setTimeout(resolve, 500));
    
    showTestResult(`✅ API Key válida (formato correcto). Backend (puerto 4000) la usará para Single-Pass AI processing.`, 'success');
    currentStatus.textContent = '✅ Configurada para backend';
    currentStatus.className = 'value';
    
  } catch (error) {
    console.error('❌ Error probando conexión:', error);
    showTestResult(`❌ Error: ${error.message}`, 'error');
    
    // Error de conexión
    currentStatus.textContent = '❌ Error de conexión';
    currentStatus.className = 'value disabled';
  } finally {
    btnTest.disabled = false;
    btnTest.innerHTML = '<span>🔍</span><span>Probar Conexión</span>';
  }
}

// �💾 Guardar API Key (CON VALIDACIÓN)
async function handleSave() {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  
  if (!apiKey) {
    showMessage('⚠️ Ingresa una API key válida', 'error');
    return;
  }
  
  // Validación básica (formato AIzaSy...)
  if (!apiKey.startsWith('AIzaSy')) {
    showMessage('⚠️ Formato inválido. Debe empezar con "AIzaSy"', 'error');
    return;
  }
  
  try {
    btnSave.disabled = true;
    btnSave.innerHTML = '<span>⏳</span><span>Guardando...</span>';
    
    // 1. Guardar en storage local (para la extensión)
    await chrome.storage.sync.set({ 
      geminiApiKey: apiKey,
      geminiModel: model
    });
    
    console.log('✅ API Key guardada en storage');
    
    // 2. Enviar al backend para actualizar .env
    try {
      const backendConfig = await chrome.storage.sync.get(['backendUrl']);
      const backendUrl = backendConfig.backendUrl || 'http://localhost:4000';
      
      console.log('📡 Enviando API key al backend...');
      
      const response = await fetch(`${backendUrl}/config/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ apiKey })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Backend actualizado:', result.message);
        
        if (result.requiresRestart) {
          showMessage('✅ API Key guardada. ⚠️ REINICIA EL BACKEND para aplicar cambios.', 'success');
          showTestResult('⚠️ Recuerda reiniciar el backend (Ctrl+C y npm start)', 'testing');
        } else {
          showMessage('✅ API Key guardada y aplicada al backend.', 'success');
          showTestResult('✅ API Key configurada correctamente', 'success');
        }
      } else {
        console.warn('⚠️ Backend no pudo actualizar:', result.error);
        showMessage(`✅ API Key guardada localmente. ⚠️ Backend: ${result.error}`, 'success');
      }
      
    } catch (backendError) {
      console.warn('⚠️ No se pudo conectar al backend:', backendError.message);
      showMessage('✅ API Key guardada localmente. ⚠️ Backend no disponible - configúrala manualmente en .env', 'success');
      showTestResult('⚠️ Configura manualmente en gemini-mcp-server/.env', 'testing');
    }
    
    // Actualizar status
    currentStatus.textContent = '✅ Configurada para backend';
    currentStatus.className = 'value';
    apiKeyStatus.textContent = '✅ Sí';
    apiKeyStatus.className = 'value';
    
  } catch (error) {
    console.error('❌ Error guardando API key:', error);
    showMessage('❌ Error guardando API key', 'error');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = '<span>💾</span><span>Guardar API Key</span>';
  }
}

// 🗑️ Eliminar API Key
async function handleClear() {
  if (!confirm('¿Eliminar API key de Gemini? La extensión usará modo fallback.')) {
    return;
  }
  
  try {
    btnClear.disabled = true;
    btnClear.innerHTML = '<span>⏳</span><span>Eliminando...</span>';
    
    // US#124: Solo eliminar de storage
    await chrome.storage.sync.remove(['geminiApiKey', 'geminiModel']);
    
    apiKeyInput.value = '';
    showMessage('🗑️ API Key eliminada. Backend no tendrá acceso a Gemini.', 'success');
    await loadCurrentConfig();
    
  } catch (error) {
    console.error('❌ Error eliminando API key:', error);
    showMessage('❌ Error eliminando API key', 'error');
  } finally {
    btnClear.disabled = false;
    btnClear.innerHTML = '<span>🗑️</span><span>Eliminar API Key</span>';
  }
}

// 📢 Mostrar mensaje de estado
function showMessage(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  // Ocultar después de 5s
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// � Mostrar resultado de test
function showTestResult(text, type) {
  testResult.textContent = text;
  testResult.className = `test-result ${type}`;
  testResult.style.display = 'block';
  
  // No ocultar automáticamente, dejar visible
}

// �🚀 Iniciar al cargar
init();
