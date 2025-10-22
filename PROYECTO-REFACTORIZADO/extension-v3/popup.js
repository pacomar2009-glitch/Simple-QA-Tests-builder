// 🎮 US#120 + US#121 - POPUP CONTROLLER
// Interfaz de usuario para controlar grabación

console.log('🎮 Popup cargado');

// Referencias a elementos DOM
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnExport = document.getElementById('btn-export'); // US#92
const btnConfig = document.getElementById('btn-config'); // US#121
const btnClear = document.getElementById('btn-clear'); // CLEAR/RESET
const btnGenerate = document.getElementById('btn-generate'); // MCP GENERATE
const statusEl = document.getElementById('status');
const eventsCountEl = document.getElementById('events-count');
const sessionIdEl = document.getElementById('session-id');
const casesCountEl = document.getElementById('cases-count'); // US#57
const casesCompletedEl = document.getElementById('cases-completed'); // US#57
const generationProgress = document.getElementById('generation-progress');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressLogs = document.getElementById('progress-logs');
const testPreview = document.getElementById('test-preview');
const testCodePreview = document.getElementById('test-code-preview');

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
  btnGenerate.addEventListener('click', handleGenerateTest); // MCP GENERATE
  
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
  
  // MCP GENERATE: Habilitar solo si hay casos completados y NO está grabando
  const hasCompletedCases = (currentState.casesStats?.completed || 0) > 0;
  btnGenerate.disabled = !hasCompletedCases || currentState.isRecording;
  
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

// 🎭 HANDLE GENERATE TEST (MCP PLAYWRIGHT)
async function handleGenerateTest() {
  console.log('🎭 Generando test con MCP Playwright...');
  
  btnGenerate.disabled = true;
  
  try {
    // Obtener casos exportables
    const exportResponse = await chrome.runtime.sendMessage({ type: 'EXPORT_CASES' });
    
    console.log('📦 Export response:', exportResponse);
    
    if (!exportResponse.success || !exportResponse.cases || exportResponse.cases.length === 0) {
      showNotification('No hay casos completados para generar test', 'warning');
      btnGenerate.disabled = false;
      return;
    }
    
    // Tomar el último caso completado
    const lastCase = exportResponse.cases[exportResponse.cases.length - 1];
    
    console.log('📝 Caso seleccionado:', lastCase.name, '- Pasos:', lastCase.steps?.length);
    
    if (!lastCase.steps || lastCase.steps.length === 0) {
      showNotification('El caso no tiene pasos capturados', 'warning');
      btnGenerate.disabled = false;
      return;
    }
    
    // Mostrar panel de progreso
    generationProgress.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = 'Conectando con backend...';
    progressLogs.innerHTML = '<div style="color: #9CA3AF;">🔌 Conectando...</div>';
    testPreview.style.display = 'none';
    
    // Obtener backend URL de storage
    const backendConfig = await chrome.storage.sync.get(['backendUrl']);
    const backendUrl = backendConfig.backendUrl || 'http://localhost:4000';
    
    // Preparar payload
    const payload = {
      sessionId: lastCase.id,
      steps: lastCase.steps,
      metadata: {
        sessionName: lastCase.name,
        initialUrl: lastCase.initialUrl,
        description: lastCase.description
      }
    };
    
    // Conectar con SSE (Server-Sent Events)
    const eventSource = new EventSource(`${backendUrl}/test-generation/mcp-generate`);
    
    // NO funciona EventSource con POST, usar fetch con streaming
    const response = await fetch(`${backendUrl}/test-generation/mcp-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // Leer stream
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
          handleProgressUpdate(data);
        }
      }
    }
    
    showNotification('✅ Test generado exitosamente', 'success');
    
  } catch (error) {
    console.error('❌ Error generando test:', error);
    showNotification(`Error: ${error.message}`, 'error');
    
    // Mostrar error en logs
    const errorDiv = document.createElement('div');
    errorDiv.style.color = '#EF4444';
    errorDiv.textContent = `❌ ${error.message}`;
    progressLogs.appendChild(errorDiv);
    
  } finally {
    btnGenerate.disabled = false;
  }
}

// 📊 HANDLE PROGRESS UPDATE (SSE)
function handleProgressUpdate(data) {
  const { phase, message, progress, data: additionalData, error } = data;
  
  // Actualizar progress bar
  if (progress !== undefined) {
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${progress}% - ${message}`;
  }
  
  // Agregar log
  const logDiv = document.createElement('div');
  logDiv.style.marginBottom = '5px';
  
  // Color según fase
  let color = '#6B7280';
  let icon = '•';
  
  switch (phase) {
    case 'analyzing':
      color = '#3B82F6';
      icon = '🔍';
      break;
    case 'browser_start':
      color = '#8B5CF6';
      icon = '🌐';
      break;
    case 'reproducing':
      color = '#F59E0B';
      icon = '🎬';
      break;
    case 'generating_code':
      color = '#10B981';
      icon = '✍️';
      break;
    case 'saving':
      color = '#06B6D4';
      icon = '💾';
      break;
    case 'completed':
      color = '#10B981';
      icon = '✅';
      break;
    case 'error':
      color = '#EF4444';
      icon = '❌';
      break;
  }
  
  logDiv.style.color = color;
  logDiv.innerHTML = `<strong>${icon}</strong> ${message}`;
  progressLogs.appendChild(logDiv);
  
  // Auto-scroll
  progressLogs.scrollTop = progressLogs.scrollHeight;
  
  // Mostrar preview si está completo
  if (phase === 'completed' && additionalData && additionalData.result) {
    testPreview.style.display = 'block';
    testCodePreview.textContent = additionalData.result.testCode || 'Test generado ✅';
  }
  
  // Si es flujo, mostrar detalles
  if (phase === 'analyzing' && additionalData && additionalData.flows) {
    const flowDiv = document.createElement('div');
    flowDiv.style.color = '#6B7280';
    flowDiv.style.marginLeft = '20px';
    flowDiv.innerHTML = additionalData.flows.map(f => `  • ${f.name}`).join('<br>');
    progressLogs.appendChild(flowDiv);
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
