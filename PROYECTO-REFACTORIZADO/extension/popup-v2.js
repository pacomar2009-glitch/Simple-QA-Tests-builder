// ===================================
// 🎯 POPUP v2 - Advanced UI with Reordering & Filtering
// ===================================

console.log('🚀 [Popup v2] Inicializando...');

// ===================================
// 📊 Estado de la aplicación
// ===================================

// Estados de UI posibles
const UIStates = {
  IDLE: 'IDLE',                                    // Estado inicial - mostrar opciones
  TEST_LAUNCHER_ACTIVE: 'TEST_LAUNCHER_ACTIVE',   // Test Launcher en progreso
  MANUAL_RECORDING: 'MANUAL_RECORDING',            // Grabación manual activa
  CAPTURE_COMPLETE: 'CAPTURE_COMPLETE',            // Captura completada
  GENERATING: 'GENERATING'                         // Generando test con IA
};

const AppState = {
  isRecording: false,
  sessionId: null,
  recordedActions: [],
  selectedActionIndex: null,
  
  // Nuevo: Estado actual de UI
  currentUIState: UIStates.IDLE,
  
  // Nuevo: Datos del test activo (si aplica)
  activeTestData: null,
  
  update(changes) {
    Object.assign(this, changes);
    render();
    persistState();
  },
  
  // Nuevo: Transiciones de estado
  transitionTo(newState, data = null) {
    console.log(`🔄 [State] Transición: ${this.currentUIState} → ${newState}`);
    this.currentUIState = newState;
    this.activeTestData = data;
    render();
    persistState();
  }
};

// ===================================
// 💾 Persistencia en chrome.storage
// ===================================
function persistState() {
  chrome.storage.local.set({
    recordedActions: AppState.recordedActions,
    sessionId: AppState.sessionId,
    recordingActive: AppState.isRecording,
    currentUIState: AppState.currentUIState,
    activeTestData: AppState.activeTestData
  }, () => {
    console.log('💾 [Popup v2] Estado guardado:', {
      actionsCount: AppState.recordedActions.length,
      isRecording: AppState.isRecording,
      uiState: AppState.currentUIState
    });
  });
}

function loadState() {
  chrome.storage.local.get([
    'recordedActions', 
    'sessionId', 
    'recordingActive',
    'currentUIState',
    'activeTestData'
  ], (data) => {
    AppState.recordedActions = data.recordedActions || [];
    AppState.sessionId = data.sessionId || null;
    AppState.isRecording = data.recordingActive || false;
    AppState.currentUIState = data.currentUIState || UIStates.IDLE;
    AppState.activeTestData = data.activeTestData || null;
    
    console.log('📂 [Popup v2] Estado cargado:', {
      actionsCount: AppState.recordedActions.length,
      isRecording: AppState.isRecording,
      uiState: AppState.currentUIState
    });
    
    render();
  });
}

// ===================================
// 🎨 Renderizado de UI
// ===================================
function render() {
  updateStatusBar();
  updateControls();
  renderActionsList();
}

function updateStatusBar() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const actionCount = document.getElementById('actionCount');
  
  // Actualizar según estado UI
  switch (AppState.currentUIState) {
    case UIStates.IDLE:
      statusDot.classList.remove('recording');
      statusText.textContent = AppState.recordedActions.length > 0 ? 
        'Captura lista para enviar' : 'Listo para comenzar';
      break;
      
    case UIStates.TEST_LAUNCHER_ACTIVE:
      statusDot.classList.add('recording');
      statusText.textContent = '🚀 Test en progreso';
      break;
      
    case UIStates.MANUAL_RECORDING:
      statusDot.classList.add('recording');
      statusText.textContent = '⏺️ Grabando manualmente';
      break;
      
    case UIStates.CAPTURE_COMPLETE:
      statusDot.classList.remove('recording');
      statusText.textContent = `✅ ${AppState.recordedActions.length} acciones capturadas`;
      break;
      
    case UIStates.GENERATING:
      statusDot.classList.add('recording');
      statusText.textContent = '🤖 Generando test con IA...';
      break;
  }
  
  actionCount.textContent = AppState.recordedActions.length;
}

// Nueva función: Actualizar información del test activo
function updateTestInfo() {
  const testInfo = document.getElementById('testInfo');
  if (!testInfo || !AppState.activeTestData) return;
  
  const { url, windowId, startTime } = AppState.activeTestData;
  
  // Calcular tiempo transcurrido
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  testInfo.innerHTML = `
    <div class="test-info-content">
      <div class="test-info-row">
        <span class="test-info-label">🕶️ Ventana de Test:</span>
        <span class="test-info-value">${url || 'Cargando...'}</span>
      </div>
      <div class="test-info-row">
        <span class="test-info-label">⏱️ Tiempo:</span>
        <span class="test-info-value">${timeStr}</span>
      </div>
      <div class="test-info-row">
        <span class="test-info-label">📊 Acciones:</span>
        <span class="test-info-value badge-count">${AppState.recordedActions.length}</span>
      </div>
    </div>
  `;
}

function updateControls() {
  const btnLauncher = document.getElementById('btnLauncher');
  const btnRecord = document.getElementById('btnRecord');
  const btnStop = document.getElementById('btnStop');
  const btnSend = document.getElementById('btnSend');
  const btnClear = document.getElementById('btnClear');
  
  console.log('====================================');
  console.log('🎮 [updateControls] LLAMADO');
  console.log('🎮 Estado:', AppState.currentUIState);
  console.log('🎮 Acciones:', AppState.recordedActions.length);
  console.log('🎮 Elementos encontrados:');
  console.log('  - btnLauncher:', btnLauncher ? '✅' : '❌ NULL');
  console.log('  - btnRecord:', btnRecord ? '✅' : '❌ NULL');
  console.log('  - btnStop:', btnStop ? '✅' : '❌ NULL');
  console.log('  - btnSend:', btnSend ? '✅' : '❌ NULL');
  console.log('  - btnClear:', btnClear ? '✅' : '❌ NULL');
  console.log('====================================');
  
  // ⚠️ VALIDACIÓN CRÍTICA: Si los elementos no existen, abortar
  if (!btnLauncher || !btnRecord || !btnStop || !btnSend || !btnClear) {
    console.error('❌ [updateControls] ERROR: No se encontraron todos los botones. Abortando.');
    return;
  }
  
  // Contenedor de info adicional (lo crearemos después)
  const testInfo = document.getElementById('testInfo');
  
  // Lógica basada en el estado actual de UI
  switch (AppState.currentUIState) {
    case UIStates.IDLE:
      // Estado inicial: solo mostrar Launcher y Grabar
      console.log('🎮 [updateControls] IDLE - Mostrando Launcher y Grabar');
      btnLauncher.style.display = 'inline-block';
      btnRecord.style.display = 'inline-block';
      btnStop.style.display = 'none';
      btnSend.style.display = 'none';
      btnClear.style.display = 'none';
      if (testInfo) testInfo.style.display = 'none';
      
      btnLauncher.disabled = false;
      btnRecord.disabled = false;
      
      // Stop y Send no se muestran, pero asegurar que están deshabilitados
      btnStop.disabled = true;
      btnSend.disabled = true;
      break;
      
    case UIStates.TEST_LAUNCHER_ACTIVE:
      // Test Launcher activo: mostrar info del test, botones de Stop y Send
      console.log('🎮 [updateControls] TEST_LAUNCHER_ACTIVE - Mostrando Stop y Send');
      btnLauncher.style.display = 'none';
      btnRecord.style.display = 'none';
      btnStop.style.display = 'inline-block';
      btnSend.style.display = 'inline-block';
      btnClear.style.display = 'none';
      if (testInfo) testInfo.style.display = 'block';
      
      // Stop siempre habilitado cuando está grabando
      btnStop.disabled = false;
      // Send solo habilitado si hay acciones capturadas
      btnSend.disabled = AppState.recordedActions.length === 0;
      
      console.log(`🎮 [Controls] TEST_LAUNCHER_ACTIVE - Actions: ${AppState.recordedActions.length}, Send enabled: ${AppState.recordedActions.length > 0}`);
      
      // Actualizar info del test
      updateTestInfo();
      break;
      
    case UIStates.MANUAL_RECORDING:
      // Grabación manual: similar a test launcher pero sin info de ventana
      console.log('🎮 [updateControls] MANUAL_RECORDING - Mostrando Stop y Send');
      btnLauncher.style.display = 'none';
      btnRecord.style.display = 'none';
      btnStop.style.display = 'inline-block';
      btnSend.style.display = 'inline-block';
      btnClear.style.display = 'none';
      if (testInfo) testInfo.style.display = 'none';
      
      // Stop siempre habilitado cuando está grabando
      btnStop.disabled = false;
      // Send solo habilitado si hay acciones capturadas
      btnSend.disabled = AppState.recordedActions.length === 0;
      
      console.log(`🎮 [Controls] MANUAL_RECORDING - Actions: ${AppState.recordedActions.length}, Send enabled: ${AppState.recordedActions.length > 0}`);
      break;
      
    case UIStates.CAPTURE_COMPLETE:
      // Captura completada: mostrar Send, Clear y opción de nueva captura
      btnLauncher.style.display = 'inline-block';
      btnRecord.style.display = 'inline-block';
      btnStop.style.display = 'none';
      btnSend.style.display = 'inline-block';
      btnClear.style.display = 'inline-block';
      if (testInfo) testInfo.style.display = 'none';
      
      btnLauncher.disabled = false;
      btnRecord.disabled = false;
      btnSend.disabled = AppState.recordedActions.length === 0;
      btnClear.disabled = AppState.recordedActions.length === 0;
      break;
      
    case UIStates.GENERATING:
      // Generando con IA: deshabilitar todo excepto indicador de progreso
      btnLauncher.style.display = 'none';
      btnRecord.style.display = 'none';
      btnStop.style.display = 'none';
      btnSend.style.display = 'none';
      btnClear.style.display = 'none';
      if (testInfo) testInfo.style.display = 'none';
      break;
  }
}

function renderActionsList() {
  const container = document.getElementById('actionsContainer');
  const emptyState = document.getElementById('emptyState');
  
  console.log(`🎨 [Popup v2] Renderizando ${AppState.recordedActions.length} acciones`);
  
  // Mostrar empty state si no hay acciones
  if (AppState.recordedActions.length === 0) {
    emptyState.style.display = 'block';
    container.querySelectorAll('.action-card').forEach(card => card.remove());
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Limpiar contenedor
  container.querySelectorAll('.action-card').forEach(card => card.remove());
  
  // Renderizar cada acción
  AppState.recordedActions.forEach((action, index) => {
    const card = createActionCard(action, index);
    container.appendChild(card);
  });
  
  // Auto-scroll al último elemento
  if (AppState.isRecording) {
    container.scrollTop = container.scrollHeight;
  }
}

function createActionCard(action, index) {
  const card = document.createElement('div');
  card.className = 'action-card';
  card.setAttribute('draggable', 'true');
  card.dataset.index = index;
  
  // Drag Handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.textContent = '⋮⋮';
  dragHandle.title = 'Arrastra para reordenar';
  
  // Action Number
  const actionNumber = document.createElement('div');
  actionNumber.className = 'action-number';
  actionNumber.textContent = index + 1;
  
  // Action Content
  const content = document.createElement('div');
  content.className = 'action-content';
  
  const typeSpan = document.createElement('span');
  typeSpan.className = `action-type ${action.type}`;
  typeSpan.textContent = action.type;
  
  const targetSpan = document.createElement('span');
  targetSpan.className = 'action-target';
  targetSpan.textContent = action.selector || action.url || 'Sin selector';
  targetSpan.title = action.selector || action.url || 'Sin selector';
  
  const valueSpan = document.createElement('span');
  valueSpan.className = action.sensitive ? 'action-value sensitive' : 'action-value';
  if (action.value) {
    valueSpan.textContent = action.sensitive ? '🔒 ***MASKED***' : `💬 ${action.value}`;
  } else if (action.text) {
    valueSpan.textContent = `📝 ${action.text.substring(0, 50)}${action.text.length > 50 ? '...' : ''}`;
  }
  
  const timestampSpan = document.createElement('span');
  timestampSpan.className = 'action-timestamp';
  timestampSpan.textContent = new Date(action.timestamp).toLocaleTimeString('es-ES');
  
  content.appendChild(typeSpan);
  content.appendChild(targetSpan);
  if (action.value || action.text) content.appendChild(valueSpan);
  content.appendChild(timestampSpan);
  
  // Reorder Controls
  const reorderControls = document.createElement('div');
  reorderControls.className = 'reorder-controls';
  
  const btnUp = document.createElement('button');
  btnUp.className = 'btn-reorder';
  btnUp.textContent = '↑';
  btnUp.title = 'Mover arriba (Alt+↑)';
  btnUp.disabled = index === 0;
  btnUp.onclick = (e) => {
    e.stopPropagation();
    moveAction(index, 'up');
  };
  
  const btnDown = document.createElement('button');
  btnDown.className = 'btn-reorder';
  btnDown.textContent = '↓';
  btnDown.title = 'Mover abajo (Alt+↓)';
  btnDown.disabled = index === AppState.recordedActions.length - 1;
  btnDown.onclick = (e) => {
    e.stopPropagation();
    moveAction(index, 'down');
  };
  
  reorderControls.appendChild(btnUp);
  reorderControls.appendChild(btnDown);
  
  // Delete Button
  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.textContent = '🗑️';
  btnDelete.title = 'Eliminar (Supr)';
  btnDelete.onclick = (e) => {
    e.stopPropagation();
    deleteAction(index);
  };
  
  // Ensamblar card
  card.appendChild(dragHandle);
  card.appendChild(actionNumber);
  card.appendChild(content);
  card.appendChild(reorderControls);
  card.appendChild(btnDelete);
  
  // Eventos de drag & drop
  setupDragAndDrop(card, index);
  
  // Evento de selección (para atajos de teclado)
  card.onclick = () => {
    document.querySelectorAll('.action-card').forEach(c => c.style.outline = 'none');
    card.style.outline = '2px solid #667eea';
    AppState.selectedActionIndex = index;
  };
  
  return card;
}

// ===================================
// 🔄 Reordenamiento de Acciones
// ===================================
function moveAction(index, direction) {
  const actions = [...AppState.recordedActions];
  
  if (direction === 'up' && index > 0) {
    [actions[index - 1], actions[index]] = [actions[index], actions[index - 1]];
    AppState.selectedActionIndex = index - 1;
  } else if (direction === 'down' && index < actions.length - 1) {
    [actions[index], actions[index + 1]] = [actions[index + 1], actions[index]];
    AppState.selectedActionIndex = index + 1;
  } else {
    return; // No se puede mover
  }
  
  AppState.update({ recordedActions: actions });
  
  console.log(`🔄 [Popup v2] Acción movida ${direction}:`, index);
}

function reorderAction(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  
  const actions = [...AppState.recordedActions];
  const [movedItem] = actions.splice(fromIndex, 1);
  actions.splice(toIndex, 0, movedItem);
  
  AppState.update({ recordedActions: actions });
  
  console.log(`🔄 [Popup v2] Acción reordenada: ${fromIndex} → ${toIndex}`);
}

// ===================================
// 🗑️ Eliminación de Acciones
// ===================================
function deleteAction(index) {
  const action = AppState.recordedActions[index];
  
  // Confirmación visual
  if (!confirm(`¿Eliminar esta acción?\n\n${action.type}: ${action.selector || action.url}`)) {
    return;
  }
  
  const actions = [...AppState.recordedActions];
  actions.splice(index, 1);
  
  AppState.update({ recordedActions: actions });
  AppState.selectedActionIndex = null;
  
  console.log(`🗑️ [Popup v2] Acción eliminada:`, index);
}

// ===================================
// 🎯 Drag & Drop
// ===================================
let draggedIndex = null;

function setupDragAndDrop(card, index) {
  card.addEventListener('dragstart', (e) => {
    draggedIndex = index;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
    
    console.log(`🎯 [Drag] Start: ${index}`);
  });
  
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.action-card').forEach(c => c.classList.remove('drag-over'));
    draggedIndex = null;
    
    console.log(`🎯 [Drag] End`);
  });
  
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetIndex = parseInt(card.dataset.index);
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      card.classList.add('drag-over');
    }
  });
  
  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over');
  });
  
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    
    const toIndex = parseInt(card.dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      reorderAction(draggedIndex, toIndex);
      console.log(`🎯 [Drag] Drop: ${draggedIndex} → ${toIndex}`);
    }
  });
}

// ===================================
// ⌨️ Atajos de Teclado
// ===================================
document.addEventListener('keydown', (e) => {
  // Alt + ↑ (Mover arriba)
  if (e.altKey && e.key === 'ArrowUp') {
    e.preventDefault();
    if (AppState.selectedActionIndex !== null) {
      moveAction(AppState.selectedActionIndex, 'up');
    }
  }
  
  // Alt + ↓ (Mover abajo)
  if (e.altKey && e.key === 'ArrowDown') {
    e.preventDefault();
    if (AppState.selectedActionIndex !== null) {
      moveAction(AppState.selectedActionIndex, 'down');
    }
  }
  
  // Supr (Eliminar)
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (AppState.selectedActionIndex !== null && !AppState.isRecording) {
      e.preventDefault();
      deleteAction(AppState.selectedActionIndex);
    }
  }
});

// ===================================
// 🎬 Controles de Grabación
// ===================================

// Botón Test Launcher
document.getElementById('btnLauncher').addEventListener('click', () => {
  console.log('🚀 [Popup v2] Abriendo Test Launcher...');
  chrome.tabs.create({
    url: chrome.runtime.getURL('test-launcher.html')
  });
});

document.getElementById('btnRecord').addEventListener('click', async () => {
  console.log('====================================');
  console.log('🎬 [btnRecord] CLICK DETECTADO');
  console.log('🎬 [btnRecord] Estado ANTES:', AppState.currentUIState);
  console.log('====================================');
  
  // 🔒 VALIDACIÓN CRÍTICA: Verificar estado global
  const globalStateResponse = await chrome.runtime.sendMessage({ action: 'getGlobalState' });
  
  if (!globalStateResponse || !globalStateResponse.success) {
    alert('❌ Error al verificar estado global');
    return;
  }
  
  const globalState = globalStateResponse.state;
  console.log('🌐 [btnRecord] Estado global:', globalState);
  
  // Validar si ya hay grabación activa
  if (globalState.isRecording) {
    alert('❌ Ya hay una grabación activa.\n\nDetén la grabación actual antes de iniciar una nueva.');
    console.warn('⚠️ [btnRecord] Grabación rechazada: ya hay una sesión activa');
    return;
  }
  
  // Validar si hay Test Launcher activo
  if (globalState.activeTestWindow) {
    const msg = `❌ Hay un Test Launcher activo.\n\n` +
                `Ventana: ${globalState.activeTestWindow.windowId}\n` +
                `URL: ${globalState.activeTestWindow.url}\n\n` +
                `Cierra la ventana de test antes de iniciar grabación manual.`;
    alert(msg);
    console.warn('⚠️ [btnRecord] Grabación rechazada: Test Launcher activo');
    return;
  }
  
  // Ahora sí, iniciar grabación
  const sessionId = `session_${Date.now()}`;
  
  // Enviar mensaje al background
  chrome.runtime.sendMessage({
    action: 'startRecording',
    sessionId: sessionId
  }, (response) => {
    console.log('🎬 [btnRecord] Respuesta de background:', response);
    
    if (response?.success) {
      console.log('====================================');
      console.log('✅ [btnRecord] Grabación iniciada exitosamente');
      console.log('✅ [btnRecord] Transicionando a MANUAL_RECORDING...');
      console.log('====================================');
      
      AppState.update({
        isRecording: true,
        sessionId: sessionId,
        recordedActions: [] // Reset actions
      });
      
      // Transición a MANUAL_RECORDING
      AppState.transitionTo(UIStates.MANUAL_RECORDING);
      
      console.log('✅ [btnRecord] Estado DESPUÉS:', AppState.currentUIState);
      console.log('✅ [btnRecord] Grabación manual iniciada:', sessionId);
      
      // Polling para actualizar acciones en tiempo real
      startPolling();
    } else {
      console.error('❌ [btnRecord] Error al iniciar grabación:', response);
      alert(`❌ Error al iniciar la grabación:\n\n${response?.error || 'Error desconocido'}`);
    }
  });
});

document.getElementById('btnStop').addEventListener('click', async () => {
  console.log('⏹️ [Popup v2] Deteniendo grabación...');
  
  // Enviar mensaje al background para detener grabación
  chrome.runtime.sendMessage({
    action: 'stopRecording'
  }, async (response) => {
    if (response?.success) {
      console.log('✅ [Popup v2] Grabación detenida:', response.actionsCount);
      
      // Detener polling primero
      stopPolling();
      
      // 🚪 Cerrar ventana de Test Launcher si existe
      const closeResponse = await chrome.runtime.sendMessage({ action: 'closeTestWindow' });
      
      if (closeResponse?.windowId) {
        console.log('🚪 [Popup v2] Ventana de test cerrada:', closeResponse.windowId);
      } else {
        console.log('ℹ️ [Popup v2] No había ventana de test activa');
      }
      
      // Actualizar estado sin persistir (para no sobrescribir)
      AppState.isRecording = false;
      
      // Transición a CAPTURE_COMPLETE
      AppState.transitionTo(UIStates.CAPTURE_COMPLETE);
      
      // Esperar a que content script guarde y luego cargar
      setTimeout(() => {
        loadState();
      }, 800); // Aumentado a 800ms para dar más tiempo
      
    } else {
      console.error('❌ [Popup v2] Error al detener grabación:', response);
      alert('Error al detener la grabación.');
    }
  });
});

document.getElementById('btnClear').addEventListener('click', async () => {
  if (!confirm('¿Seguro que quieres eliminar TODAS las acciones?')) {
    return;
  }
  
  // 🧹 Limpiar storage completamente
  await chrome.storage.local.set({
    capturedSteps: [],
    recordedActions: [],
    sessionId: null,
    sessionData: {
      isRecording: false,
      sessionId: null
    },
    recordingActive: false
  });
  
  // 🌐 Resetear GlobalState en background
  await chrome.runtime.sendMessage({ action: 'resetGlobalState' });
  
  // 🚪 Cerrar ventana de test si existe
  await chrome.runtime.sendMessage({ action: 'closeTestWindow' });
  
  AppState.update({
    recordedActions: [],
    sessionId: null,
    selectedActionIndex: null,
    isRecording: false
  });
  
  // Transición de vuelta a IDLE
  AppState.transitionTo(UIStates.IDLE);
  
  console.log('🗑️ [Popup v2] Todo limpiado: acciones, storage y GlobalState');
});

document.getElementById('btnSend').addEventListener('click', async () => {
  if (AppState.recordedActions.length === 0) {
    alert('No hay acciones para enviar');
    return;
  }
  
  console.log('🚀 [Popup v2] Enviando a n8n...', AppState.recordedActions);
  
  // Transición a GENERATING
  AppState.transitionTo(UIStates.GENERATING);
  
  const btnSend = document.getElementById('btnSend');
  btnSend.disabled = true;
  btnSend.textContent = '⏳ Enviando...';
  
  try {
    const response = await fetch('http://localhost:5678/webhook/testbuilder/capture-v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: AppState.sessionId,
        actions: AppState.recordedActions,
        timestamp: Date.now(),
        version: 'v2-filtered'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Popup v2] Enviado exitosamente:', data);
      alert(`✅ Acciones enviadas a IA (${AppState.recordedActions.length} pasos)`);
      
      // Volver a IDLE después de enviar
      AppState.transitionTo(UIStates.IDLE);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('❌ [Popup v2] Error al enviar:', error);
    alert(`❌ Error al enviar: ${error.message}\n\nVerifica que n8n esté corriendo en localhost:5678`);
    
    // Volver a CAPTURE_COMPLETE en caso de error
    AppState.transitionTo(UIStates.CAPTURE_COMPLETE);
  } finally {
    btnSend.disabled = false;
    btnSend.textContent = '🚀 Enviar a IA';
  }
});

// ===================================
// 🔄 Polling para actualización en tiempo real
// ===================================
let pollingInterval = null;
let timerInterval = null;

function startPolling() {
  if (pollingInterval) return;
  
  pollingInterval = setInterval(() => {
    chrome.storage.local.get(['recordedActions'], (data) => {
      if (data.recordedActions) {
        // Siempre actualizar, sin comparar longitud (puede haber cambios en navegación)
        const newLength = data.recordedActions.length;
        const currentLength = AppState.recordedActions.length;
        
        if (newLength !== currentLength) {
          console.log(`🔄 [Popup v2] Polling detectó cambio: ${currentLength} → ${newLength} acciones`);
          AppState.recordedActions = data.recordedActions;
          render();
        }
      }
    });
  }, 300); // Cada 300ms para más rapidez
  
  console.log('🔄 [Popup v2] Polling iniciado');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏹️ [Popup v2] Polling detenido');
  }
}

// Actualizar timer del test activo
function startTestTimer() {
  if (timerInterval) return;
  
  timerInterval = setInterval(() => {
    if (AppState.currentUIState === UIStates.TEST_LAUNCHER_ACTIVE) {
      updateTestInfo();
    }
  }, 1000); // Cada segundo
  
  console.log('⏱️ [Popup v2] Timer de test iniciado');
}

function stopTestTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    console.log('⏱️ [Popup v2] Timer de test detenido');
  }
}

// ===================================
// 📖 Mostrar atajos de teclado
// ===================================
document.getElementById('showShortcuts').addEventListener('click', (e) => {
  e.preventDefault();
  const hint = document.getElementById('shortcutsHint');
  hint.classList.add('visible');
  
  setTimeout(() => {
    hint.classList.remove('visible');
  }, 5000);
});

// ===================================
// 🚀 Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 [Popup v2] DOM cargado');
  loadState();
  
  // Si estaba grabando, reiniciar polling
  if (AppState.isRecording) {
    startPolling();
  }
  
  // Si hay un test launcher activo, reiniciar timer
  if (AppState.currentUIState === UIStates.TEST_LAUNCHER_ACTIVE) {
    startTestTimer();
  }
  
  // ===================================
  // 🆘 Help Modal - Event Listeners
  // ===================================
  const btnHelp = document.getElementById('btnHelp');
  const helpModal = document.getElementById('helpModal');
  const closeModal = document.getElementById('closeModal');
  
  if (btnHelp && helpModal && closeModal) {
    // Abrir modal
    btnHelp.addEventListener('click', () => {
      console.log('❓ [Help] Abriendo modal de ayuda');
      helpModal.classList.add('active');
    });
    
    // Cerrar modal con botón X
    closeModal.addEventListener('click', () => {
      console.log('❓ [Help] Cerrando modal de ayuda');
      helpModal.classList.remove('active');
    });
    
    // Cerrar modal al hacer click fuera del contenido
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) {
        console.log('❓ [Help] Cerrando modal (click outside)');
        helpModal.classList.remove('active');
      }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpModal.classList.contains('active')) {
        console.log('❓ [Help] Cerrando modal (Escape)');
        helpModal.classList.remove('active');
      }
    });
    
    console.log('✅ [Help] Event listeners configurados');
    
    // ===================================
    // 🔍 Auto-check: Verificar permiso de incógnito
    // ===================================
    chrome.extension.isAllowedIncognitoAccess((isAllowed) => {
      if (!isAllowed) {
        console.warn('⚠️ [Help] Permiso de incógnito NO está activado');
        
        // Verificar si ya se mostró el modal hoy
        chrome.storage.local.get(['helpModalShownToday'], (result) => {
          const today = new Date().toDateString();
          const lastShown = result.helpModalShownToday;
          
          // Mostrar solo si no se ha mostrado hoy (evitar spam)
          if (lastShown !== today) {
            console.log('ℹ️ [Help] Mostrando modal automáticamente (primera vez hoy)');
            setTimeout(() => {
              helpModal.classList.add('active');
              
              // Guardar que se mostró hoy
              chrome.storage.local.set({ helpModalShownToday: today });
            }, 1500); // Delay de 1.5s para que no sea invasivo
          } else {
            console.log('ℹ️ [Help] Modal ya se mostró hoy, no se volverá a mostrar');
          }
        });
      } else {
        console.log('✅ [Help] Permiso de incógnito está activo');
      }
    });
  } else {
    console.warn('⚠️ [Help] No se encontraron elementos del modal de ayuda');
  }
});

// ===================================
// 📡 Escuchar eventos de background.js
// ===================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 [Popup v2] Mensaje recibido:', message);
  
  switch (message.type) {
    case 'TEST_LAUNCHER_STARTED':
      // Test Launcher inició una ventana de test
      console.log('🚀 [Popup v2] Test Launcher activado:', message.data);
      AppState.transitionTo(UIStates.TEST_LAUNCHER_ACTIVE, {
        url: message.data.url,
        windowId: message.data.windowId,
        startTime: Date.now()
      });
      
      // Iniciar grabación automáticamente
      AppState.update({
        isRecording: true,
        sessionId: message.data.sessionId,
        recordedActions: []
      });
      
      // Iniciar polling para actualizaciones
      startPolling();
      
      // Iniciar timer para reloj
      startTestTimer();
      break;
      
    case 'TEST_WINDOW_CLOSED':
      // 🚪 Ventana de test se cerró
      console.log('🕶️ [Popup v2] Ventana de test cerrada:', message.data);
      
      // Detener polling y timer
      stopPolling();
      stopTestTimer();
      
      // Si hay acciones capturadas, ir a COMPLETE, sino a IDLE
      if (AppState.recordedActions.length > 0) {
        AppState.transitionTo(UIStates.CAPTURE_COMPLETE);
      } else {
        AppState.transitionTo(UIStates.IDLE);
      }
      
      AppState.update({ isRecording: false });
      break;
      
    case 'ACTION_CAPTURED':
      // Nueva acción capturada (opcional, ya tenemos polling)
      console.log('📊 [Popup v2] Nueva acción:', message.action);
      break;
  }
  
  sendResponse({ received: true });
  return true;
});

console.log('✅ [Popup v2] Script cargado');
