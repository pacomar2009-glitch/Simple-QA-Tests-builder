// 🎮 US#120 - POPUP CONTROLLER
// Interfaz de usuario para controlar grabación

console.log('🎮 Popup cargado');

// Referencias a elementos DOM
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const statusEl = document.getElementById('status');
const eventsCountEl = document.getElementById('events-count');
const sessionIdEl = document.getElementById('session-id');

// Estado local
let currentState = {
  isRecording: false,
  eventsCount: 0,
  sessionId: null
};

// 🚀 INICIALIZAR POPUP
async function init() {
  console.log('🚀 Inicializando popup...');
  
  // Obtener estado actual
  await updateState();
  
  // Adjuntar listeners
  btnRecord.addEventListener('click', handleRecord);
  btnStop.addEventListener('click', handleStop);
  
  console.log('✅ Popup inicializado');
}

// 🔄 ACTUALIZAR ESTADO DESDE BACKGROUND
async function updateState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    
    if (response.success) {
      currentState = response.state;
      renderState();
    }
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
  }
}

// 🎨 RENDERIZAR ESTADO EN UI
function renderState() {
  if (currentState.isRecording) {
    // GRABANDO
    statusEl.innerHTML = '<span class="pulse"></span>Grabando';
    statusEl.className = 'status-value recording';
    btnRecord.disabled = true;
    btnStop.disabled = false;
    eventsCountEl.textContent = currentState.eventsCount || 0;
    sessionIdEl.textContent = currentState.sessionId || '-';
    
  } else {
    // IDLE
    statusEl.textContent = 'Idle';
    statusEl.className = 'status-value idle';
    btnRecord.disabled = false;
    btnStop.disabled = true;
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
      
      // Mostrar notificación
      showNotification('✅ Grabación iniciada', 'success');
      
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
      
      // TODO: US#121 - Aquí se llamará a IA Ligera para pre-análisis
      console.log('📍 Próximo: Enviar a US#121 (IA Ligera Gemini Flash)');
      
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

// 📢 MOSTRAR NOTIFICACIÓN
function showNotification(message, type = 'info') {
  // Por ahora, usar alert simple
  // TODO: Implementar toast notifications
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Opcional: Chrome notifications API
  if (type === 'success') {
    // Green flash en el status
    statusEl.style.color = '#00FF00';
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
