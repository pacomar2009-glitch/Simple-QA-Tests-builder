// 🎮 US#120 + US#121 - POPUP CONTROLLER
// Interfaz de usuario para controlar grabación

console.log('🎮 Popup cargado');

// Referencias a elementos DOM
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnExport = document.getElementById('btn-export'); // US#92
const btnConfig = document.getElementById('btn-config'); // US#121
const btnClear = document.getElementById('btn-clear'); // CLEAR/RESET
const statusEl = document.getElementById('status');
const eventsCountEl = document.getElementById('events-count');
const sessionIdEl = document.getElementById('session-id');
const casesCountEl = document.getElementById('cases-count'); // US#57
const casesCompletedEl = document.getElementById('cases-completed'); // US#57

// Estado local
let currentState = {
  isRecording: false,
  eventsCount: 0,
  sessionId: null,
  casesStats: { total: 0, completed: 0 } // US#57
};

// 🚀 INICIALIZAR POPUP
async function init() {
  console.log('🚀 Inicializando popup...');
  
  // Obtener estado actual
  await updateState();
  
  // Adjuntar listeners
  btnRecord.addEventListener('click', handleRecord);
  btnStop.addEventListener('click', handleStop);
  btnExport.addEventListener('click', handleExport); // US#92
  btnConfig.addEventListener('click', handleConfig); // US#121
  btnClear.addEventListener('click', handleClear); // CLEAR/RESET
  
  console.log('✅ Popup inicializado');
}

// 🔄 ACTUALIZAR ESTADO DESDE BACKGROUND
async function updateState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    
    if (response.success) {
      currentState.isRecording = response.state.isRecording;
      currentState.eventsCount = response.state.eventsCount;
      currentState.sessionId = response.state.sessionId;
      // US#57: Stats de casos
      currentState.casesStats = response.state.queueStats || { total: 0, completed: 0 };
      
      renderState();
    }
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
  }
}

// 🎨 RENDERIZAR ESTADO EN UI
function renderState() {
  // US#57: Estadísticas de casos
  casesCountEl.textContent = currentState.casesStats?.total || 0;
  casesCompletedEl.textContent = currentState.casesStats?.completed || 0;
  
  // US#92: Habilitar botón de export solo si hay casos
  const hasCases = (currentState.casesStats?.total || 0) > 0;
  btnExport.disabled = !hasCases || currentState.isRecording;
  
  if (currentState.isRecording) {
    // GRABANDO
    statusEl.innerHTML = '<span class="pulse"></span>Grabando';
    statusEl.className = 'status-value recording';
    btnRecord.disabled = true;
    btnRecord.textContent = 'Start Recording'; // Reset text
    btnStop.disabled = false;
    btnStop.textContent = 'Stop Recording'; // Reset text
    eventsCountEl.textContent = currentState.eventsCount || 0;
    sessionIdEl.textContent = currentState.sessionId || '-';
    
  } else {
    // IDLE
    statusEl.textContent = 'Idle';
    statusEl.className = 'status-value idle';
    btnRecord.disabled = false;
    btnRecord.textContent = 'Start Recording'; // Reset text
    btnStop.disabled = true;
    btnStop.textContent = 'Stop Recording'; // Reset text
    eventsCountEl.textContent = '0';
    sessionIdEl.textContent = '-';
  }
}

// 🔴 HANDLE RECORD BUTTON
async function handleRecord() {
  console.log('🔴 Iniciando grabación...');
  
  btnRecord.disabled = true;
  btnRecord.textContent = 'Iniciando...';
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    
    if (response.success) {
      console.log('✅ Grabación iniciada:', response);
      
      // Actualizar estado
      currentState.isRecording = true;
      currentState.sessionId = response.sessionId;
      currentState.eventsCount = 0;
      
      renderState();
      
      // Notificación de captura raw (sin IA)
      showNotification('✅ Grabación iniciada - Captura raw (análisis en backend)', 'success');
      
    } else {
      console.error('❌ Error iniciando grabación:', response.error);
      showNotification(`❌ Error: ${response.error}`, 'error');
      btnRecord.disabled = false;
    }
    
  } catch (error) {
    console.error('❌ Error en handleRecord:', error);
    showNotification('❌ Error de comunicación', 'error');
    btnRecord.disabled = false;
  }
}

// ⏹️ HANDLE STOP BUTTON
async function handleStop() {
  console.log('⏹️ Deteniendo grabación...');
  
  btnStop.disabled = true;
  btnStop.textContent = 'Deteniendo...';
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    
    if (response.success) {
      console.log('✅ Grabación detenida:', response);
      
      // Actualizar estado
      currentState.isRecording = false;
      currentState.sessionId = null;
      currentState.eventsCount = 0;
      
      renderState();
      
      // Mostrar notificación con stats
      showNotification(
        `✅ Grabación detenida\n${response.eventsCount} eventos capturados`,
        'success'
      );
      
      // Eventos raw capturados - Backend los procesará con IA single-pass
      console.log('✅ Eventos raw capturados - Listos para backend single-pass');
      
    } else {
      console.error('❌ Error deteniendo grabación:', response.error);
      showNotification(`❌ Error: ${response.error}`, 'error');
      btnStop.disabled = false;
    }
    
  } catch (error) {
    console.error('❌ Error en handleStop:', error);
    showNotification('❌ Error de comunicación', 'error');
    btnStop.disabled = false;
  }
}

// � US#92 - HANDLE EXPORT ZIP BUTTON
async function handleExport() {
  console.log('📥 Exportando casos a ZIP...');
  
  btnExport.disabled = true;
  const originalText = btnExport.innerHTML;
  btnExport.innerHTML = '<span>⏳</span><span>Exportando...</span>';
  
  try {
    const response = await chrome.runtime.sendMessage({ type: 'DOWNLOAD_EXPORT_ZIP' });
    
    if (response.success) {
      console.log('✅ ZIP exportado:', response);
      
      // Mostrar notificación de éxito
      showNotification(
        `✅ ZIP descargado\n${response.casesExported} casos exportados\nTamaño: ${(response.size / 1024).toFixed(2)} KB`,
        'success'
      );
      
      // Restaurar botón después de 2 segundos
      setTimeout(() => {
        btnExport.innerHTML = originalText;
        btnExport.disabled = false;
      }, 2000);
      
    } else {
      console.error('❌ Error exportando ZIP:', response.error);
      showNotification(`❌ Error: ${response.error}`, 'error');
      btnExport.innerHTML = originalText;
      btnExport.disabled = false;
    }
    
  } catch (error) {
    console.error('❌ Error en handleExport:', error);
    showNotification('❌ Error de comunicación', 'error');
    btnExport.innerHTML = originalText;
    btnExport.disabled = false;
  }
}

// ⚙️ US#121 - ABRIR PÁGINA DE CONFIGURACIÓN
function handleConfig() {
  console.log('⚙️ Abriendo configuración...');
  chrome.tabs.create({ url: chrome.runtime.getURL('config.html') });
}

// 🗑️ LIMPIAR/RESET CASOS Y CONTADOR
async function handleClear() {
  console.log('🗑️ Limpiando casos...');
  
  // Confirmar acción destructiva
  if (!confirm('¿Seguro que deseas limpiar TODOS los casos? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    btnClear.disabled = true;
    btnClear.innerHTML = '<span>⏳</span><span>Limpiando...</span>';
    
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_CASES' });
    
    if (response.success) {
      showNotification('✅ Casos limpiados correctamente', 'success');
      await updateState(); // Actualizar contador
      
      // Deshabilitar export si no hay casos
      btnExport.disabled = true;
    } else {
      showNotification('❌ Error: ' + response.error, 'error');
    }
    
  } catch (error) {
    console.error('❌ Error limpiando casos:', error);
    showNotification('❌ Error limpiando casos', 'error');
  } finally {
    btnClear.disabled = false;
    btnClear.innerHTML = '<span>🗑️</span><span>Limpiar Casos</span>';
  }
}

// 📢 MOSTRAR NOTIFICACIÓN
function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Flash visual según tipo
  if (type === 'success') {
    statusEl.style.color = '#00FF00';
    setTimeout(() => {
      renderState();
    }, 1000);
  } else if (type === 'warning') {
    // Warning notification
    statusEl.style.color = '#f59e0b';
    statusEl.style.fontWeight = 'bold';
    setTimeout(() => {
      renderState();
    }, 2000);
  } else if (type === 'error') {
    statusEl.style.color = '#FF0000';
    setTimeout(() => {
      renderState();
    }, 1000);
  }
}

// 🔄 POLLING PARA ACTUALIZAR CONTADOR DE EVENTOS (cada 1s mientras graba)
setInterval(async () => {
  if (currentState.isRecording) {
    await updateState();
  }
}, 1000);

// 🚀 INICIALIZAR AL CARGAR
init();

console.log('✅ Popup controller configurado correctamente');
