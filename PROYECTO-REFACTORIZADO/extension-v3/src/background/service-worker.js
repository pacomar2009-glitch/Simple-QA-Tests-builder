// 🔧 US#120 - SERVICE WORKER (Background)
// Gestiona MCP Chrome DevTools y comunicación con content scripts

// 📋 US#57 - Import CasesQueueManager
import { CasesQueueManager } from '../shared/cases-queue.js';

// 📥 US#92 - Import Export Utils
import { ExportUtils } from '../shared/export-utils.js';

console.log('🚀 TestBuilder Agéntico v3 - Service Worker iniciado (US#120 + US#124 + US#57 + US#92)');
console.log('📦 US#124: Captura RAW sin IA - Backend procesará con Single-Pass');

// 🗄️ Estado global de grabación
const state = {
  isRecording: false,
  currentTabId: null,
  debuggerAttached: false,
  capturedEvents: [],
  sessionId: null,
  casesQueue: null // US#57: Gestor de cola de casos
};

// 📋 US#57 - Inicializar CasesQueueManager
async function initializeCasesQueue() {
  state.casesQueue = new CasesQueueManager();
  await state.casesQueue.initialize();
  console.log('📋 CasesQueueManager inicializado correctamente');
}

// Inicializar sistemas al cargar service worker
initializeCasesQueue().catch(error => {
  console.error('❌ Error inicializando service worker:', error);
});

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
          sessionId: state.sessionId,
          captureMode: 'RAW_CAPTURE', // US#124: Sin IA en extensión
          backendProcessing: 'Single-Pass AI', // US#123: Backend procesará
          currentCase: state.casesQueue?.getCurrentCase() || null, // US#57
          queueStats: state.casesQueue?.getStats() || null // US#57
        }
      });
      return false;
    
    case 'GET_GEMINI_STATS':
      // US#124: Gemini removido de extensión
      sendResponse({ 
        success: false, 
        error: 'Gemini IA removido de extensión (US#124). Backend procesará con Single-Pass AI (US#123)' 
      });
      return false;
      
    case 'USER_ACTION':
      // US#124: Captura de eventos RAW (sin IA)
      if (state.isRecording) {
        captureUserAction(message.payload)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // async response
      }
      sendResponse({ success: false, error: 'Not recording' });
      return false;
      
    case 'CONFIGURE_TEST_GEMINI':
      // US#124: Gemini removido de extensión
      sendResponse({ 
        success: false, 
        error: 'Gemini IA removido de extensión (US#124). Backend procesará con Single-Pass AI (US#123)',
        info: 'No se requiere configuración de API key en extensión'
      });
      return false;
      
    case 'CONFIGURE_GEMINI_API_KEY':
      // US#124: Gemini removido de extensión
      sendResponse({ 
        success: false, 
        error: 'Gemini IA removido de extensión (US#124). Backend procesará con Single-Pass AI (US#123)',
        info: 'API key se configurará en backend'
      });
      return false;
      
    // 📋 US#57 - Nuevos handlers para gestión de cola de casos
    case 'CREATE_CASE':
      state.casesQueue.addNewCase(message.caseData || {})
        .then(newCase => {
          sendResponse({ success: true, case: newCase });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'SWITCH_CASE':
      state.casesQueue.startRecordingCase(message.caseId)
        .then(result => {
          if (result && state.isRecording) {
            // Actualizar badge con nuevo número de caso (GLOBAL)
            const currentCase = state.casesQueue.getCurrentCase();
            if (currentCase) {
              chrome.action.setBadgeText({ 
                text: `#${currentCase.number}` // SIN tabId = global
              });
            }
          }
          sendResponse({ success: result, currentCase: state.casesQueue.getCurrentCase() });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'DELETE_CASE':
      state.casesQueue.deleteCase(message.caseId)
        .then(result => {
          sendResponse({ success: result });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    case 'GET_CASES':
      const limit = message.limit || 3;
      const cases = state.casesQueue.getRecentCases(limit);
      sendResponse({ 
        success: true, 
        cases,
        total: state.casesQueue.cases.length 
      });
      return false;
      
    case 'GET_ALL_CASES':
      sendResponse({ 
        success: true, 
        cases: state.casesQueue.getAllCases() 
      });
      return false;
      
    case 'GET_QUEUE_STATS':
      sendResponse({ 
        success: true, 
        stats: state.casesQueue.getStats() 
      });
      return false;
      
    case 'EXPORT_QUEUE_DATA':
      sendResponse({ 
        success: true, 
        data: state.casesQueue.exportData() 
      });
      return false;
      
    // 📥 US#92 - Export y descarga de ZIP
    case 'DOWNLOAD_EXPORT_ZIP':
      handleExportZIP(sendResponse);
      return true; // Async response
      
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
    
    // 📋 US#57: Crear nuevo caso en la cola
    const tabInfo = await chrome.tabs.get(tabId);
    const newCase = await state.casesQueue.addNewCase({
      name: `Caso ${state.casesQueue.cases.length + 1}`,
      description: `Grabación automática desde ${new Date().toLocaleString()}`,
      url: tabInfo.url
    });
    
    // 📋 US#57: Iniciar grabación del caso
    await state.casesQueue.startRecordingCase(newCase.id);
    
    // 2. Adjuntar Chrome Debugger (MCP Chrome DevTools)
    await attachDebugger(tabId);
    
    // 3. Actualizar estado
    state.isRecording = true;
    state.currentTabId = tabId;
    state.sessionId = `session-${Date.now()}`;
    state.capturedEvents = [];
    
    // 4. Asegurar que content script está inyectado (evita "Receiving end does not exist")
    try {
      await ensureContentScriptInjected(tabId);
    } catch (error) {
      console.warn('⚠️ Content script ya existe o error al inyectar:', error.message);
    }
    
    // 5. Notificar content script (ahora seguro que existe)
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'RECORDING_STARTED',
        sessionId: state.sessionId,
        caseId: newCase.id, // US#57: Incluir ID del caso
        caseNumber: newCase.number // US#57: Incluir número del caso
      });
    } catch (error) {
      console.warn('⚠️ No se pudo notificar a content script:', error.message);
      // No es crítico, content script puede no existir en páginas especiales
    }
    
    // 6. Badge visual con número de caso (US#57) - GLOBAL (sin tabId para persistir)
    const badgeText = `#${newCase.number}`;
    const geminiEnabled = state.geminiAI?.isInitialized || false;
    const badgeColor = geminiEnabled ? '#FF0000' : '#f59e0b'; // Naranja si es fallback
    
    await chrome.action.setBadgeText({ text: badgeText }); // SIN tabId = global
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor }); // SIN tabId = global
    
    console.log(`✅ Grabación iniciada - Case: #${newCase.number} - Session: ${state.sessionId}`);
    
    // 🚨 US#121 FIX: Notificación explícita si está en modo fallback
    if (!geminiEnabled) {
      console.warn('⚠️ MODO FALLBACK ACTIVO: Gemini IA no disponible. Usando análisis heurístico básico.');
      console.warn('   → Configura API key en: chrome-extension://' + chrome.runtime.id + '/config.html');
      
      // Mostrar notificación al usuario (con manejo de errores)
      try {
        await chrome.notifications.create('fallback-warning', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon-48.png'), // Usar ruta completa
          title: '⚠️ Grabación en Modo Fallback',
          message: 'Gemini IA no disponible. Usando análisis básico sin IA.\n\nConfigura tu API key para pre-análisis inteligente.',
          priority: 1,
          requireInteraction: false
        });
        console.log('✅ Notificación de fallback mostrada');
      } catch (notifError) {
        console.error('❌ Error creando notificación de fallback:', notifError);
      }
    }
    
    return {
      success: true,
      sessionId: state.sessionId,
      tabId,
      geminiEnabled, // Informar al popup del modo actual
      caseId: newCase.id, // US#57: Incluir ID del caso
      caseNumber: newCase.number // US#57: Incluir número del caso
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
    // 📋 US#57: Obtener caso actual antes de completarlo
    const currentCase = state.casesQueue.getCurrentCase();
    
    // 1. Detach debugger
    if (state.debuggerAttached && state.currentTabId) {
      await detachDebugger(state.currentTabId);
    }
    
    // 2. Notificar content script
    if (state.currentTabId) {
      await chrome.tabs.sendMessage(state.currentTabId, {
        type: 'RECORDING_STOPPED'
      }).catch(() => console.warn('Tab cerrado, ignorando'));
      
      // 3. Limpiar badge (global)
      await chrome.action.setBadgeText({ text: '' }); // SIN tabId = global
    }
    
    // 4. Guardar sesión en storage (mantener compatibilidad)
    const session = {
      sessionId: state.sessionId,
      events: state.capturedEvents,
      timestamp: new Date().toISOString(),
      eventsCount: state.capturedEvents.length,
      caseId: currentCase?.id, // US#57: Vincular con caso
      caseNumber: currentCase?.number // US#57: Vincular con número
    };
    
    await chrome.storage.local.set({
      [`session_${state.sessionId}`]: session
    });
    
    // 📋 US#57: Completar caso actual
    if (currentCase) {
      await state.casesQueue.stopCurrentCase();
      console.log(`✅ Caso #${currentCase.number} completado con ${currentCase.steps.length} pasos`);
    }
    
    console.log(`✅ Grabación detenida - ${state.capturedEvents.length} eventos capturados`);
    
    const result = {
      success: true,
      sessionId: state.sessionId,
      eventsCount: state.capturedEvents.length,
      events: state.capturedEvents,
      caseId: currentCase?.id, // US#57: Incluir ID del caso
      caseNumber: currentCase?.number, // US#57: Incluir número del caso
      caseSteps: currentCase?.steps.length || 0 // US#57: Total de steps en el caso
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

// � INYECTAR CONTENT SCRIPT (evita "Receiving end does not exist")
async function ensureContentScriptInjected(tabId) {
  try {
    // Intentar inyectar content script programáticamente
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['src/content/capture.js']
    });
    console.log('✅ Content script inyectado correctamente');
  } catch (error) {
    // Si falla, probablemente ya está inyectado o es página protegida
    if (error.message.includes('Cannot access')) {
      console.warn('⚠️ No se puede inyectar en esta página (chrome://, extensions://, etc.)');
    }
    throw error;
  }
}

// �🐛 ADJUNTAR CHROME DEBUGGER (MCP Chrome DevTools)
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
// US#121: Ahora incluye pre-análisis con Gemini IA Ligera
// US#57: Añade steps al caso actual en la cola
async function captureUserAction(action) {
  console.log(`📝 Acción capturada (RAW - sin IA): ${action.type}`);
  
  // 📦 US#124 - Captura RAW sin pre-análisis IA
  // Backend procesará con Single-Pass AI (Issue #125)
  const event = {
    type: 'user_action',
    action,
    timestamp: Date.now(),
    sessionId: state.sessionId,
    capturePhase: 'RAW_CAPTURE', // US#124: Indica captura sin IA
    note: 'Backend procesará con Single-Pass AI' // US#123: Referencia a refactorización
  };
  
  state.capturedEvents.push(event);
  
  // 📋 US#57: Añadir step al caso actual
  if (state.casesQueue) {
    const stepData = {
      number: state.capturedEvents.length,
      type: action.type,
      selector: action.selector,
      value: action.value || null,
      text: action.text || null,
      tagName: action.tagName,
      attributes: action.attributes,
      position: action.position,
      url: action.url,
      pageTitle: action.pageTitle,
      timestamp: Date.now(),
      capturePhase: 'RAW_CAPTURE' // US#124: Sin aiPreAnalysis
    };
    
    await state.casesQueue.addStepToCurrentCase(stepData);
  }
  
  console.log(`📝 Evento RAW guardado (US#124):`, {
    type: action.type,
    selector: action.selector,
    capturePhase: 'RAW_CAPTURE',
    note: 'Backend procesará con Single-Pass AI'
  });
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

// 📥 US#92 - EXPORT Y DESCARGA DE ZIP
async function handleExportZIP(sendResponse) {
  console.log('📥 Iniciando export JSON...');
  
  try {
    // 1. Obtener datos de exportación
    const exportData = state.casesQueue.exportData();
    
    if (exportData.cases.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'No hay casos para exportar' 
      });
      return;
    }
    
    // 2. Crear ZIP con ExportUtils
    const result = await ExportUtils.exportCases(exportData);
    
    // 3. Convertir Blob a data URL para chrome.downloads
    const reader = new FileReader();
    reader.onloadend = function() {
      const dataUrl = reader.result;
      
      // 4. Descargar archivo
      chrome.downloads.download({
        url: dataUrl,
        filename: result.filename,
        saveAs: true // Permitir al usuario elegir ubicación
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Error en descarga:', chrome.runtime.lastError);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else {
          console.log(`✅ JSON exportado: ${result.filename} (${result.size} bytes)`);
          sendResponse({ 
            success: true, 
            filename: result.filename,
            size: result.size,
            downloadId: downloadId,
            casesExported: exportData.cases.length
          });
        }
      });
    };
    
    reader.readAsDataURL(result.blob);
    
  } catch (error) {
    console.error('❌ Error generando ZIP:', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
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
