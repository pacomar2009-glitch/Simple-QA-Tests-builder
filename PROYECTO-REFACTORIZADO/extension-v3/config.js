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
      
      // MOSTRAR ESTADO COMO "Configurada (requiere validación)"
      // NO asumimos que funciona hasta que se valide
      currentStatus.textContent = '⚠️ Configurada (no validada)';
      currentStatus.className = 'value disabled';
      apiKeyStatus.textContent = '✅ Sí';
      apiKeyStatus.className = 'value';
      
      // Mostrar hint para validar
      showTestResult('⚠️ API Key configurada. Click "Probar Conexión" para validar', 'testing');
    } else {
      currentStatus.textContent = '⚠️ Fallback (sin API key)';
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
    btnTest.innerHTML = '<span>⏳</span><span>Probando...</span>';
    showTestResult('⏳ Probando conexión con Gemini API (' + model + ')...', 'testing');
    
    // Llamar al service worker para test real
    const response = await chrome.runtime.sendMessage({
      type: 'CONFIGURE_TEST_GEMINI',
      apiKey: apiKey,
      model: model
    });
    
    if (response.success) {
      showTestResult('✅ ¡Conexión exitosa! API Key funciona correctamente', 'success');
      
      // Actualizar status a ACTIVO solo si la validación fue exitosa
      currentStatus.textContent = '✅ Activo y validado';
      currentStatus.className = 'value';
    } else {
      showTestResult(`❌ Conexión fallida: ${response.error}`, 'error');
      
      // Actualizar status a ERROR si la validación falló
      currentStatus.textContent = '❌ Error en validación';
      currentStatus.className = 'value disabled';
    }
    
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
    btnSave.innerHTML = '<span>⏳</span><span>Validando...</span>';
    
    // PASO 1: VALIDAR API KEY CON TEST REAL
    const testResponse = await chrome.runtime.sendMessage({
      type: 'CONFIGURE_TEST_GEMINI',
      apiKey: apiKey,
      model: model
    });
    
    if (!testResponse.success) {
      showMessage(`❌ API Key inválida: ${testResponse.error}`, 'error');
      btnSave.disabled = false;
      btnSave.innerHTML = '<span>💾</span><span>Guardar API Key</span>';
      return;
    }
    
    // PASO 2: SI ES VÁLIDA, GUARDAR
    btnSave.innerHTML = '<span>⏳</span><span>Guardando...</span>';
    
    await chrome.storage.sync.set({ 
      geminiApiKey: apiKey,
      geminiModel: model
    });
    
    // Notificar al service worker
    const response = await chrome.runtime.sendMessage({
      type: 'CONFIGURE_GEMINI_API_KEY',
      apiKey: apiKey,
      model: model
    });
    
    if (response.success) {
      showMessage('✅ API Key validada y guardada correctamente', 'success');
      showTestResult('✅ API Key funciona correctamente', 'success');
      
      // Actualizar status directamente (ya validada)
      currentStatus.textContent = '✅ Activo y validado';
      currentStatus.className = 'value';
      apiKeyStatus.textContent = '✅ Sí';
      apiKeyStatus.className = 'value';
    } else {
      showMessage(`❌ Error: ${response.error}`, 'error');
    }
    
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
    
    // Eliminar de storage
    await chrome.storage.sync.remove(['geminiApiKey']);
    
    // Notificar al service worker
    await chrome.runtime.sendMessage({
      type: 'CONFIGURE_GEMINI_API_KEY',
      apiKey: ''
    });
    
    apiKeyInput.value = '';
    showMessage('🗑️ API Key eliminada. Usando fallback.', 'success');
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
