// US#121 - CONFIG.JS
// Script para página de configuración de Gemini API Key

console.log('⚙️ Página de configuración cargada');

// Referencias DOM
const apiKeyInput = document.getElementById('api-key');
const btnSave = document.getElementById('btn-save');
const btnClear = document.getElementById('btn-clear');
const statusMessage = document.getElementById('status-message');
const currentStatus = document.getElementById('current-status');
const apiKeyStatus = document.getElementById('api-key-status');

// 🚀 Inicializar
async function init() {
  await loadCurrentConfig();
  
  // Listeners
  btnSave.addEventListener('click', handleSave);
  btnClear.addEventListener('click', handleClear);
  
  console.log('✅ Config page inicializada');
}

// 🔄 Cargar configuración actual
async function loadCurrentConfig() {
  try {
    // Obtener API key guardada
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    
    if (result.geminiApiKey && result.geminiApiKey.trim() !== '') {
      apiKeyInput.value = result.geminiApiKey;
      currentStatus.textContent = '✅ Activo';
      currentStatus.className = 'value';
      apiKeyStatus.textContent = '✅ Sí';
      apiKeyStatus.className = 'value';
    } else {
      currentStatus.textContent = '⚠️ Fallback (sin API key)';
      currentStatus.className = 'value disabled';
      apiKeyStatus.textContent = '❌ No';
      apiKeyStatus.className = 'value disabled';
    }
  } catch (error) {
    console.error('❌ Error cargando config:', error);
    showMessage('Error cargando configuración', 'error');
  }
}

// 💾 Guardar API Key
async function handleSave() {
  const apiKey = apiKeyInput.value.trim();
  
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
    
    // Guardar en storage
    await chrome.storage.sync.set({ geminiApiKey: apiKey });
    
    // Notificar al service worker
    const response = await chrome.runtime.sendMessage({
      type: 'CONFIGURE_GEMINI_API_KEY',
      apiKey: apiKey
    });
    
    if (response.success) {
      showMessage('✅ API Key guardada correctamente', 'success');
      await loadCurrentConfig();
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

// 🚀 Iniciar al cargar
init();
