// 🎯 US#120 + US#55 - CONTENT SCRIPT: Captura de eventos de usuario
// Se inyecta en todas las páginas para capturar interacciones

console.log('👁️ TestBuilder v3 - Content Script cargado');

// Estado de captura
let isCapturing = false;
let sessionId = null;

// 🎧 LISTENER: Mensajes desde background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`📨 Content recibió: ${message.type}`);
  
  switch (message.type) {
    case 'RECORDING_STARTED':
      startCapture(message.sessionId);
      sendResponse({ success: true });
      break;
      
    case 'RECORDING_STOPPED':
      stopCapture();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message' });
  }
  
  return false;
});

// 🚀 INICIAR CAPTURA
function startCapture(newSessionId) {
  console.log('🔴 Iniciando captura de eventos...');
  
  isCapturing = true;
  sessionId = newSessionId;
  
  // Adjuntar listeners de eventos
  document.addEventListener('click', handleClick, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('submit', handleSubmit, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  // Visual feedback
  showRecordingIndicator();
  
  console.log(`✅ Captura iniciada - Session: ${sessionId}`);
}

// ⏹️ DETENER CAPTURA
function stopCapture() {
  console.log('⏹️ Deteniendo captura de eventos...');
  
  isCapturing = false;
  sessionId = null;
  
  // Remover listeners
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('submit', handleSubmit, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  
  // Ocultar indicador
  hideRecordingIndicator();
  
  console.log('✅ Captura detenida');
}

// 🖱️ HANDLE CLICK
function handleClick(event) {
  if (!isCapturing) return;
  
  const target = event.target;
  
  const action = {
    type: 'click',
    timestamp: Date.now(),
    selector: generateSelector(target),
    tagName: target.tagName,
    text: target.textContent?.trim().substring(0, 50),
    attributes: getElementAttributes(target),
    position: {
      x: event.clientX,
      y: event.clientY
    },
    url: window.location.href
  };
  
  sendActionToBackground(action);
}

// ⌨️ HANDLE INPUT
function handleInput(event) {
  if (!isCapturing) return;
  
  const target = event.target;
  
  // No capturar passwords en claro (US#92: anonimización)
  const value = target.type === 'password' ? '[REDACTED]' : target.value;
  
  const action = {
    type: 'input',
    timestamp: Date.now(),
    selector: generateSelector(target),
    tagName: target.tagName,
    inputType: target.type,
    value,
    attributes: getElementAttributes(target),
    url: window.location.href
  };
  
  sendActionToBackground(action);
}

// 🔄 HANDLE CHANGE (selects, checkboxes, radios)
function handleChange(event) {
  if (!isCapturing) return;
  
  const target = event.target;
  
  const action = {
    type: 'change',
    timestamp: Date.now(),
    selector: generateSelector(target),
    tagName: target.tagName,
    inputType: target.type,
    value: target.type === 'checkbox' ? target.checked : target.value,
    attributes: getElementAttributes(target),
    url: window.location.href
  };
  
  sendActionToBackground(action);
}

// 📤 HANDLE SUBMIT
function handleSubmit(event) {
  if (!isCapturing) return;
  
  const target = event.target;
  
  const action = {
    type: 'submit',
    timestamp: Date.now(),
    selector: generateSelector(target),
    tagName: target.tagName,
    action: target.action,
    method: target.method,
    url: window.location.href
  };
  
  sendActionToBackground(action);
}

// ⌨️ HANDLE KEYDOWN (capturar Enter, Tab, Escape)
function handleKeyDown(event) {
  if (!isCapturing) return;
  
  const importantKeys = ['Enter', 'Tab', 'Escape'];
  
  if (importantKeys.includes(event.key)) {
    const action = {
      type: 'keydown',
      timestamp: Date.now(),
      key: event.key,
      selector: generateSelector(event.target),
      url: window.location.href
    };
    
    sendActionToBackground(action);
  }
}

// 🔍 GENERAR SELECTOR CSS (US#56: Ranking de selectores)
function generateSelector(element) {
  // Prioridad: id > name > data-testid > clase única > xpath
  
  // 1. ID (más específico)
  if (element.id) {
    return `#${element.id}`;
  }
  
  // 2. Name attribute (forms)
  if (element.name) {
    return `[name="${element.name}"]`;
  }
  
  // 3. Data-testid (testing best practice)
  if (element.dataset.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }
  
  // 4. Clases únicas
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c.trim());
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes[0]}`;
    }
  }
  
  // 5. Fallback: XPath simple
  return getXPath(element);
}

// 🗺️ GENERAR XPATH
function getXPath(element) {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }
  
  const paths = [];
  let current = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.tagName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    paths.unshift(`${tagName}${pathIndex}`);
    
    current = current.parentNode;
  }
  
  return paths.length ? `/${paths.join('/')}` : '';
}

// 📦 OBTENER ATRIBUTOS DEL ELEMENTO
function getElementAttributes(element) {
  const attrs = {};
  
  for (const attr of element.attributes) {
    // Excluir atributos muy largos o sensibles
    if (attr.name === 'style' || attr.value.length > 200) continue;
    
    attrs[attr.name] = attr.value;
  }
  
  return attrs;
}

// 📤 ENVIAR ACCIÓN AL BACKGROUND
function sendActionToBackground(action) {
  chrome.runtime.sendMessage({
    type: 'USER_ACTION',
    payload: action
  }).catch(error => {
    console.warn('⚠️ Error enviando acción:', error);
  });
}

// 🔴 MOSTRAR INDICADOR DE GRABACIÓN
function showRecordingIndicator() {
  // Crear indicador visual en esquina superior derecha
  const indicator = document.createElement('div');
  indicator.id = 'testbuilder-recording-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
    background: #FF0000;
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: sans-serif;
    font-size: 12px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    animation: pulse 1.5s infinite;
  `;
  indicator.textContent = '🔴 REC';
  
  // Animación pulse
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(indicator);
}

// ⚪ OCULTAR INDICADOR
function hideRecordingIndicator() {
  const indicator = document.getElementById('testbuilder-recording-indicator');
  if (indicator) {
    indicator.remove();
  }
}

console.log('✅ Content Script configurado correctamente');
