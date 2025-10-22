// 🔧 US#120 - SERVICE WORKER (Background)
// Gestiona MCP Chrome DevTools y comunicación con content scripts

console.log('🚀 TestBuilder Agéntico v3 - Service Worker iniciado (US#120)');

// 🗄️ Estado global de grabación
const state = {
  isRecording: false,
  currentTabId: null,
  debuggerAttached: false,
  capturedEvents: [],
  sessionId: null
};

// 🎧 LISTENER: Comandos de teclado
chrome.commands.onCommand.addListener((command) => {
  console.log(`⌨️ Comando recibido: ${command}`);
  
  if (command === 'toggle-recording') {
    toggleRecording();
  }
});

// 🎧 LISTENER: Mensajes desde content script y popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Mensaje recibido:', message.type);
  
  switch (message.type) {
    case 'START_RECORDING':
      startRecording(sender.tab?.id || message.tabId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // async response
      
    case 'STOP_RECORDING':
      stopRecording()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'GET_STATE':
      sendResponse({
        success: true,
        state: {
          isRecording: state.isRecording,
          eventsCount: state.capturedEvents.length,
          sessionId: state.sessionId
        }
      });
      return false;
      
    case 'USER_ACTION':
      // US#55: Captura de eventos desde content script
      if (state.isRecording) {
        captureUserAction(message.payload);
      }
      sendResponse({ success: true });
      return false;
      
    default:
      console.warn(`⚠️ Tipo de mensaje desconocido: ${message.type}`);
      sendResponse({ success: false, error: 'Unknown message type' });
      return false;
  }
});

// 🚀 INICIAR GRABACIÓN
async function startRecording(tabId) {
  console.log(`🔴 Iniciando grabación en tab: ${tabId}`);
  
  if (state.isRecording) {
    return { success: false, error: 'Recording already in progress' };
  }
  
  try {
    // 1. Verificar tab activo
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab.id;
    }
    
    // 2. Adjuntar Chrome Debugger (MCP Chrome DevTools)
    await attachDebugger(tabId);
    
    // 3. Actualizar estado
    state.isRecording = true;
    state.currentTabId = tabId;
    state.sessionId = `session-${Date.now()}`;
    state.capturedEvents = [];
    
    // 4. Notificar content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'RECORDING_STARTED',
      sessionId: state.sessionId
    });
    
    // 5. Actualizar badge
    await chrome.action.setBadgeText({ text: 'REC', tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#FF0000', tabId });
    
    console.log(`✅ Grabación iniciada - Session: ${state.sessionId}`);
    
    return {
      success: true,
      sessionId: state.sessionId,
      tabId
    };
    
  } catch (error) {
    console.error('❌ Error al iniciar grabación:', error);
    return { success: false, error: error.message };
  }
}

// ⏹️ DETENER GRABACIÓN
async function stopRecording() {
  console.log('⏹️ Deteniendo grabación...');
  
  if (!state.isRecording) {
    return { success: false, error: 'No recording in progress' };
  }
  
  try {
    // 1. Detach debugger
    if (state.debuggerAttached && state.currentTabId) {
      await detachDebugger(state.currentTabId);
    }
    
    // 2. Notificar content script
    if (state.currentTabId) {
      await chrome.tabs.sendMessage(state.currentTabId, {
        type: 'RECORDING_STOPPED'
      }).catch(() => console.warn('Tab cerrado, ignorando'));
      
      // 3. Limpiar badge
      await chrome.action.setBadgeText({ text: '', tabId: state.currentTabId });
    }
    
    // 4. Guardar sesión en storage
    const session = {
      sessionId: state.sessionId,
      events: state.capturedEvents,
      timestamp: new Date().toISOString(),
      eventsCount: state.capturedEvents.length
    };
    
    await chrome.storage.local.set({
      [`session_${state.sessionId}`]: session
    });
    
    console.log(`✅ Grabación detenida - ${state.capturedEvents.length} eventos capturados`);
    
    const result = {
      success: true,
      sessionId: state.sessionId,
      eventsCount: state.capturedEvents.length,
      events: state.capturedEvents
    };
    
    // 5. Reset estado
    state.isRecording = false;
    state.currentTabId = null;
    state.sessionId = null;
    state.capturedEvents = [];
    
    return result;
    
  } catch (error) {
    console.error('❌ Error al detener grabación:', error);
    return { success: false, error: error.message };
  }
}

// 🔀 TOGGLE GRABACIÓN
async function toggleRecording() {
  if (state.isRecording) {
    return await stopRecording();
  } else {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return await startRecording(activeTab.id);
  }
}

// 🐛 ADJUNTAR CHROME DEBUGGER (MCP Chrome DevTools)
async function attachDebugger(tabId) {
  console.log(`🔗 Adjuntando Chrome Debugger a tab: ${tabId}`);
  
  try {
    // Debugger target
    const target = { tabId };
    
    // Attach con versión 1.3 (compatible MCP)
    await chrome.debugger.attach(target, '1.3');
    
    // Habilitar dominios necesarios (US#120: MCP Chrome DevTools)
    await chrome.debugger.sendCommand(target, 'Network.enable');
    await chrome.debugger.sendCommand(target, 'Page.enable');
    await chrome.debugger.sendCommand(target, 'DOM.enable');
    
    state.debuggerAttached = true;
    
    // Listener para eventos del debugger
    chrome.debugger.onEvent.addListener(onDebuggerEvent);
    
    console.log('✅ Chrome Debugger adjuntado correctamente');
    
  } catch (error) {
    console.error('❌ Error adjuntando debugger:', error);
    throw error;
  }
}

// 🔌 DETACH CHROME DEBUGGER
async function detachDebugger(tabId) {
  console.log(`🔓 Desconectando Chrome Debugger de tab: ${tabId}`);
  
  try {
    const target = { tabId };
    await chrome.debugger.detach(target);
    
    state.debuggerAttached = false;
    
    // Remover listener
    chrome.debugger.onEvent.removeListener(onDebuggerEvent);
    
    console.log('✅ Chrome Debugger desconectado');
    
  } catch (error) {
    console.warn('⚠️ Error detaching debugger (puede estar ya desconectado):', error);
  }
}

// 📡 EVENTO DEL DEBUGGER (MCP Chrome DevTools)
function onDebuggerEvent(source, method, params) {
  // Solo capturar si estamos grabando
  if (!state.isRecording) return;
  
  // Filtrar eventos relevantes (US#55: captura enriquecida)
  const relevantEvents = [
    'Network.requestWillBeSent',
    'Network.responseReceived',
    'Page.frameNavigated',
    'Page.loadEventFired'
  ];
  
  if (relevantEvents.includes(method)) {
    console.log(`📡 Debugger Event: ${method}`);
    
    captureDebuggerEvent({
      method,
      params,
      timestamp: Date.now()
    });
  }
}

// 📝 CAPTURAR ACCIÓN DE USUARIO (desde content script)
function captureUserAction(action) {
  const event = {
    type: 'user_action',
    action,
    timestamp: Date.now(),
    sessionId: state.sessionId
  };
  
  state.capturedEvents.push(event);
  
  console.log(`📝 Acción capturada: ${action.type}`, event);
}

// 📝 CAPTURAR EVENTO DEL DEBUGGER
function captureDebuggerEvent(event) {
  const capturedEvent = {
    type: 'debugger_event',
    ...event,
    sessionId: state.sessionId
  };
  
  state.capturedEvents.push(capturedEvent);
}

// 🎧 LISTENER: Detach automático si user cierra debugger
chrome.debugger.onDetach.addListener((source, reason) => {
  console.warn(`⚠️ Debugger desconectado: ${reason}`);
  
  if (state.isRecording) {
    // Auto-detener grabación si debugger se desconecta
    stopRecording().catch(console.error);
  }
});

console.log('✅ US#120 - Service Worker configurado correctamente');
