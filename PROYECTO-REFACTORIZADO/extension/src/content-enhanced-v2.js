// ===================================
// 🎯 CONTENT SCRIPT v2 - SIMPLIFICADO
// ===================================
// Captura acciones del usuario con lógica clara y sin redundancias

// Prevenir carga duplicada
if (window.contentScriptV2Loaded) {
  console.log('⚠️ Content Script v2 ya cargado, abortando');
} else {
  window.contentScriptV2Loaded = true;
  console.log('🔧 Content Script v2 inicializando...');
}

// ===================================
// 💾 Estado Global
// ===================================
let isRecording = false;
let sessionId = null;
let recordedActions = [];

// Sistema unificado de debouncing/consolidación
const pendingInputs = new Map(); // { selector: { timer, element, value } }
const recentEvents = new Map();   // { eventKey: timestamp } para prevenir duplicados rápidos

// Configuración
const INPUT_DELAY = 1000;  // 1s sin escribir = consolidar input
const DEBOUNCE_MS = 100;   // 100ms para prevenir clicks duplicados
const AUTOSAVE_MS = 5000;  // 5s auto-save

let autoSaveInterval = null;

// ===================================
// 🛡️ FILTROS (Simplificados)
// ===================================

// 1. ¿Es evento real del usuario?
function isRealUserEvent(event) {
  return event.isTrusted;
}

// 2. ¿Es elemento visible?
function isVisible(element) {
  if (!element || !document.contains(element)) return false;
  
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (parseFloat(style.opacity) < 0.1) return false;
  
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  return true;
}

// 3. ¿Es evento duplicado reciente? (prevenir doble-clicks accidentales)
function isRecentDuplicate(eventType, selector) {
  const key = `${eventType}:${selector}`;
  const lastTime = recentEvents.get(key);
  const now = Date.now();
  
  if (lastTime && (now - lastTime) < DEBOUNCE_MS) {
    return true; // Es duplicado
  }
  
  recentEvents.set(key, now);
  
  // Limpiar eventos antiguos (cada 100 eventos)
  if (recentEvents.size > 100) {
    const cutoff = now - 5000;
    for (const [k, time] of recentEvents.entries()) {
      if (time < cutoff) recentEvents.delete(k);
    }
  }
  
  return false;
}

// 4. Filtro principal
function shouldCapture(event, element, type) {
  // Ignorar tags irrelevantes
  const ignored = ['script', 'style', 'meta', 'link', 'noscript'];
  if (ignored.includes(element.tagName.toLowerCase())) return false;
  
  // Validaciones básicas
  if (!isRealUserEvent(event)) return false;
  if (!isVisible(element)) return false;
  
  const selector = getSelector(element);
  if (isRecentDuplicate(type, selector)) return false;
  
  return true;
}

// ===================================
// 🎯 Selector Único
// ===================================
function getSelector(element) {
  // 1. ID único
  if (element.id) return `#${element.id}`;
  
  // 2. Name único (formularios)
  if (element.name) return `[name="${element.name}"]`;
  
  // 3. Clase + tag
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
    if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
  }
  
  // 4. XPath como fallback
  return getXPath(element);
}

function getXPath(element) {
  if (!element || element === document.documentElement) return '/html[1]';
  if (element === document.body) return '/html[1]/body[1]';
  
  let index = 1;
  const siblings = element.parentNode.childNodes;
  
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      return getXPath(element.parentNode) + `/${element.tagName.toLowerCase()}[${index}]`;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      index++;
    }
  }
  
  return '';
}

// ===================================
// 📦 Crear Acción
// ===================================
function createAction(type, element, value = '') {
  const action = {
    type,
    timestamp: Date.now(),
    url: window.location.href,
    selector: getSelector(element),
    tagName: element.tagName.toLowerCase(),
    value: element.type === 'password' ? '***MASKED***' : value,
    attributes: {
      id: element.id || '',
      name: element.name || '',
      class: element.className || '',
      placeholder: element.placeholder || ''
    }
  };
  
  console.log(`✅ Capturado: ${type} en ${action.selector}`, action);
  return action;
}

// ===================================
// 💾 Auto-Save
// ===================================
function startAutoSave() {
  if (autoSaveInterval) return;
  
  autoSaveInterval = setInterval(() => {
    if (isRecording && recordedActions.length > 0) {
      chrome.storage.local.set({
        recordedActions,
        sessionId,
        recordingActive: true
      });
      console.log(`💾 Auto-save: ${recordedActions.length} acciones`);
    }
  }, AUTOSAVE_MS);
}

function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
}

// ===================================
// 🔄 Consolidación de Inputs
// ===================================
function handleInput(element) {
  const selector = getSelector(element);
  const value = element.value;
  
  // Cancelar timer anterior si existe
  if (pendingInputs.has(selector)) {
    clearTimeout(pendingInputs.get(selector).timer);
  }
  
  // Crear nuevo timer
  const timer = setTimeout(() => {
    // Buscar acción existente del mismo campo
    const existingIndex = recordedActions.findIndex(
      a => a.type === 'input' && 
           a.selector === selector && 
           Date.now() - a.timestamp < INPUT_DELAY + 100
    );
    
    if (existingIndex !== -1) {
      // Actualizar valor
      recordedActions[existingIndex].value = value;
      recordedActions[existingIndex].timestamp = Date.now();
      console.log(`🔄 Input actualizado: ${selector} = "${value}"`);
    } else {
      // Nueva acción
      recordedActions.push(createAction('input', element, value));
    }
    
    pendingInputs.delete(selector);
  }, INPUT_DELAY);
  
  pendingInputs.set(selector, { timer, element, value });
}

// ===================================
// 🎬 Event Listeners
// ===================================

// CLICKS
document.addEventListener('click', (event) => {
  if (!isRecording) return;
  if (!shouldCapture(event, event.target, 'click')) return;
  
  recordedActions.push(createAction('click', event.target));
  console.log(`🖱️ Click capturado (Total: ${recordedActions.length})`);
}, true);

// INPUTS
document.addEventListener('input', (event) => {
  if (!isRecording) return;
  if (!shouldCapture(event, event.target, 'input')) return;
  
  handleInput(event.target);
}, true);

// SELECTS
document.addEventListener('change', (event) => {
  if (!isRecording) return;
  const el = event.target;
  if (el.tagName !== 'SELECT') return;
  if (!shouldCapture(event, el, 'change')) return;
  
  const selectedOption = el.options[el.selectedIndex];
  const action = createAction('select', el, el.value);
  action.selectedText = selectedOption?.text || '';
  recordedActions.push(action);
}, true);

// SUBMIT
document.addEventListener('submit', (event) => {
  if (!isRecording) return;
  if (!shouldCapture(event, event.target, 'submit')) return;
  
  recordedActions.push(createAction('submit', event.target));
}, true);

// ===================================
// 📨 Message Handlers
// ===================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`📨 Mensaje recibido: ${request.action}`);
  
  if (request.action === 'startRecording') {
    const wasRecording = isRecording;
    isRecording = true;
    sessionId = request.sessionId;
    
    if (!wasRecording) {
      recordedActions = [];
      pendingInputs.clear();
      recentEvents.clear();
      console.log(`🎬 Grabación iniciada: ${sessionId}`);
    } else {
      console.log(`♻️ Re-inicializando (${recordedActions.length} acciones mantenidas)`);
    }
    
    startAutoSave();
    sendResponse({ success: true });
  }
  
  if (request.action === 'continueRecording') {
    isRecording = true;
    sessionId = request.sessionId;
    startAutoSave();
    console.log(`♻️ Continuando grabación: ${sessionId} (${recordedActions.length} acciones)`);
    sendResponse({ success: true });
  }
  
  if (request.action === 'stopRecording') {
    isRecording = false;
    stopAutoSave();
    
    // Consolidar inputs pendientes
    pendingInputs.forEach((data, selector) => {
      clearTimeout(data.timer);
      recordedActions.push(createAction('input', data.element, data.value));
    });
    pendingInputs.clear();
    
    console.log(`⏹️ Grabación detenida: ${recordedActions.length} acciones`);
    
    // Guardar final
    chrome.storage.local.set({
      recordedActions,
      sessionId,
      recordingActive: false
    }, () => {
      console.log('💾 Guardado final completado');
      sendResponse({ 
        success: true, 
        actionsCount: recordedActions.length 
      });
    });
    
    return true; // Async response
  }
  
  if (request.action === 'getStatus') {
    sendResponse({
      success: true,
      isRecording,
      sessionId,
      actionsCount: recordedActions.length,
      version: 'v2-simplified'
    });
  }
  
  return true;
});

console.log('✅ Content Script v2 listo');

// ===================================
// 🔄 Auto-Recovery
// ===================================
chrome.storage.local.get(['sessionData', 'recordedActions'], (result) => {
  if (result.sessionData?.isRecording) {
    isRecording = true;
    sessionId = result.sessionData.sessionId;
    recordedActions = result.recordedActions || [];
    
    startAutoSave();
    
    console.log(`♻️ Grabación recuperada: ${sessionId} (${recordedActions.length} acciones)`);
  }
});
