// TestBuilder Popup Script - Modern Version
console.log('🧪 [POPUP] TestBuilder Popup Loading... Timestamp:', new Date().toISOString());

// Estado global de la aplicación
const AppState = {
  isRecording: false,
  recordedActions: [],
  currentSession: null,
  sessionStartTime: null,
  
  // Actualizar estado
  update(newState) {
    Object.assign(this, newState);
    this.saveToStorage();
    this.updateUI();
  },
  
  // Guardar en storage
  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        sessionData: {
          isRecording: this.isRecording,
          recordedActions: this.recordedActions,
          sessionId: this.currentSession,
          sessionStartTime: this.sessionStartTime
        }
      });
    } catch (error) {
      console.error('❌ Error saving state:', error);
    }
  },
  
  // Cargar desde storage
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(['sessionData']);
      if (result.sessionData) {
        Object.assign(this, result.sessionData);
        console.log('📊 State loaded:', this);
      }
    } catch (error) {
      console.error('❌ Error loading state:', error);
    }
  },
  
  // Actualizar UI
  updateUI() {
    UI.updateStatus();
    UI.updateStats();
    UI.updateButtons();
    UI.updateActionsList();
  }
};

// Manejo de UI
const UI = {
  elements: {},
  
  // Inicializar elementos del DOM
  init() {
    this.elements = {
      status: document.getElementById('status'),
      statusText: document.getElementById('statusText'),
      startRecord: document.getElementById('startRecord'),
      stopRecord: document.getElementById('stopRecord'),
      generateAI: document.getElementById('generateAI'),
      exportPlaywright: document.getElementById('exportPlaywright'),
      exportManualCSV: document.getElementById('exportManualCSV'),
      saveTest: document.getElementById('saveTest'),
      viewTests: document.getElementById('viewTests'),
      actionCount: document.getElementById('actionCount'),
      sessionTime: document.getElementById('sessionTime'),
      actionsLog: document.getElementById('actionsLog'),
      loading: document.getElementById('loading'),
      openConfig: document.getElementById('openConfig'),
      viewLogs: document.getElementById('viewLogs')
    };
    
    this.bindEvents();
  },
  
  // Vincular eventos
  bindEvents() {
    this.elements.startRecord.addEventListener('click', () => Actions.startRecording());
    this.elements.stopRecord.addEventListener('click', () => Actions.stopRecording());
    this.elements.generateAI.addEventListener('click', () => Actions.generateWithAI());
    this.elements.exportPlaywright.addEventListener('click', () => Actions.exportPlaywright());
    this.elements.exportManualCSV.addEventListener('click', () => Actions.exportManualCSV());
    this.elements.saveTest.addEventListener('click', () => Actions.saveTest());
    this.elements.viewTests.addEventListener('click', () => Actions.viewTests());
    this.elements.openConfig.addEventListener('click', () => Actions.openConfig());
    this.elements.viewLogs.addEventListener('click', () => Actions.viewLogs());
  },
  
  // Actualizar estado visual
  updateStatus() {
    if (AppState.isRecording) {
      this.elements.status.className = 'status recording';
      this.elements.statusText.textContent = 'Recording in progress...';
    } else {
      this.elements.status.className = 'status idle';
      this.elements.statusText.textContent = AppState.recordedActions.length > 0 ? 
        'Ready to export' : 'Ready to record';
    }
  },
  
  // Actualizar estadísticas
  updateStats() {
    this.elements.actionCount.textContent = AppState.recordedActions.length;
    
    if (AppState.isRecording && AppState.sessionStartTime) {
      this.updateSessionTime();
    } else {
      this.elements.sessionTime.textContent = '00:00';
    }
  },
  
  // Actualizar tiempo de sesión
  updateSessionTime() {
    if (!AppState.sessionStartTime) return;
    
    const elapsed = Math.floor((Date.now() - AppState.sessionStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    this.elements.sessionTime.textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },
  
  // Actualizar botones
  updateButtons() {
    const hasActions = AppState.recordedActions.length > 0;
    
    this.elements.startRecord.disabled = AppState.isRecording;
    this.elements.stopRecord.disabled = !AppState.isRecording;
    this.elements.generateAI.disabled = !hasActions || AppState.isRecording;
    this.elements.exportPlaywright.disabled = !hasActions || AppState.isRecording;
    this.elements.exportManualCSV.disabled = !hasActions || AppState.isRecording;
    this.elements.saveTest.disabled = !hasActions || AppState.isRecording;
  },
  
  // Actualizar lista de acciones
  updateActionsList() {
    if (AppState.recordedActions.length === 0) {
      this.elements.actionsLog.innerHTML = '<div class="action-item">No actions recorded yet</div>';
      return;
    }
    
    const actionsHtml = AppState.recordedActions
      .slice(-5) // Mostrar solo las últimas 5 acciones
      .map((action, index) => {
        const time = new Date(action.timestamp).toLocaleTimeString();
        return `<div class="action-item">${time} - ${action.type}: ${action.target || action.description}</div>`;
      })
      .join('');
    
    this.elements.actionsLog.innerHTML = actionsHtml;
  },
  
  // Mostrar/ocultar loading
  showLoading(show = true) {
    this.elements.loading.style.display = show ? 'block' : 'none';
  },
  
  // Mostrar notificación
  showNotification(message, type = 'info') {
    // TODO: Implementar sistema de notificaciones
    console.log(`${type.toUpperCase()}: ${message}`);
  }
};

// Acciones de la aplicación
const Actions = {
  // Iniciar grabación
  async startRecording() {
    try {
      UI.showLoading(true);
      
      AppState.update({
        isRecording: true,
        currentSession: `session_${Date.now()}`,
        sessionStartTime: Date.now(),
        recordedActions: []
      });
      
      // Enviar mensaje al background script
      const response = await chrome.runtime.sendMessage({
        action: 'startRecording',
        sessionId: AppState.currentSession
      });
      
      if (response && response.success) {
        UI.showNotification('Recording started successfully', 'success');
        console.log('🎬 Recording started');
      } else {
        throw new Error(response?.error || 'Failed to start recording');
      }
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      UI.showNotification('Failed to start recording', 'error');
      AppState.update({ isRecording: false });
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Detener grabación
  async stopRecording() {
    try {
      UI.showLoading(true);
      
      AppState.update({
        isRecording: false,
        sessionStartTime: null
      });
      
      // Enviar mensaje al background script
      const response = await chrome.runtime.sendMessage({
        action: 'stopRecording'
      });
      
      if (response && response.success) {
        UI.showNotification('Recording stopped', 'success');
        console.log('⏹️ Recording stopped');
      } else {
        throw new Error(response?.error || 'Failed to stop recording');
      }
      
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
      UI.showNotification('Failed to stop recording', 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Generar con AI
  // Generar con Enhanced MCP (anteriormente generateWithAI)
  async generateWithAI() {
    try {
      UI.showLoading(true);
      UI.showNotification('Generating optimized test with Enhanced MCP...', 'info');
      
      console.log('🎭 [POPUP] Starting Enhanced MCP generation with actions:', AppState.recordedActions.length);
      
      if (!AppState.recordedActions || AppState.recordedActions.length === 0) {
        throw new Error('No actions recorded to generate test from');
      }
      
      // Usar Enhanced MCP en lugar de Gemini API
      const response = await chrome.runtime.sendMessage({
        action: 'generateTest',
        testType: 'optimized-playwright',
        outputFormat: 'optimized-playwright',
        exportType: 'playwright', // Especificar tipo de export
        actions: AppState.recordedActions,
        customInstructions: 'Generate clean, efficient Playwright test without redundant actions using MCP Playwright for navigation and Chrome DevTools MCP for robust step detection'
      });
      
      console.log('🎭 [POPUP] Enhanced MCP response:', response);
      
      if (response && response.success) {
        // Mostrar resultados de optimización si están disponibles
        if (response.result && response.result.optimization) {
          const opt = response.result.optimization;
          const message = `Enhanced MCP Success! ${opt.originalSteps}→${opt.optimizedSteps} steps (${opt.efficiencyGain}% efficiency gain)`;
          UI.showNotification(message, 'success');
          console.log('🎭 Enhanced MCP Test Generated:', {
            originalSteps: opt.originalSteps,
            optimizedSteps: opt.optimizedSteps,
            efficiencyGain: opt.efficiencyGain,
            patternsDetected: opt.patternsDetected,
            fileName: response.result.fileName
          });
        } else {
          UI.showNotification('Enhanced test generated successfully!', 'success');
          console.log('🎭 Enhanced MCP Generation Complete');
        }
        
        // Mostrar el resultado en el textarea
        const aiResultSection = document.getElementById('aiResultSection');
        const aiResult = document.getElementById('aiResult');
        if (aiResultSection && aiResult) {
          const testContent = response.result ? response.result.content : response.test;
          aiResult.value = testContent;
          aiResultSection.style.display = 'block';
        }
        
        // Trigger download if available
        if (response.result && response.result.downloadUrl) {
          this.triggerDownload(response.result.content, response.result.fileName);
        }
      } else {
        const errorMsg = response?.error || 'Failed to generate enhanced test';
        console.error('❌ [POPUP] Enhanced MCP generation failed:', errorMsg, response);
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Error generating enhanced test:', error);
      UI.showNotification('Failed to generate test: ' + error.message, 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Exportar a Playwright Optimizado
  async exportPlaywright() {
    try {
      UI.showLoading(true);
      UI.showNotification('Generating optimized Playwright test...', 'info');
      
      // Enviar comando al background script con tipo optimizado
      const response = await chrome.runtime.sendMessage({
        action: 'generateTest',
        testType: 'optimized-playwright',
        outputFormat: 'optimized-playwright',
        exportType: 'playwright', // Especificar tipo de export automatizado
        actions: AppState.recordedActions,
        customInstructions: 'Generate clean, efficient Playwright test without redundant actions using MCP Playwright for navigation and validation'
      });
      
      if (response && response.success) {
        // Mostrar resultados de optimización si están disponibles
        if (response.result && response.result.optimization) {
          const opt = response.result.optimization;
          const message = `Optimized test generated! ${opt.originalSteps}→${opt.optimizedSteps} steps (${opt.efficiencyGain}% efficiency gain)`;
          UI.showNotification(message, 'success');
          console.log('🎭 Enhanced Playwright Test Generated:', {
            originalSteps: opt.originalSteps,
            optimizedSteps: opt.optimizedSteps,
            efficiencyGain: opt.efficiencyGain,
            patternsDetected: opt.patternsDetected,
            fileName: response.result.fileName
          });
        } else {
          UI.showNotification('Playwright test exported!', 'success');
          console.log('📝 Standard Playwright Export Complete');
        }
        
        // Trigger download if available
        if (response.result && response.result.downloadUrl) {
          this.triggerDownload(response.result.content, response.result.fileName);
        }
      } else {
        throw new Error(response?.error || 'Failed to export optimized test');
      }
      
    } catch (error) {
      console.error('❌ Error exporting optimized Playwright:', error);
      UI.showNotification('Failed to export test: ' + error.message, 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Exportar Test Manual (CSV para Jira)
  async exportManualCSV() {
    try {
      UI.showLoading(true);
      UI.showNotification('Generating manual test in CSV format for Jira...', 'info');
      
      console.log('📋 [POPUP] Starting manual CSV generation with actions:', AppState.recordedActions.length);
      
      if (!AppState.recordedActions || AppState.recordedActions.length === 0) {
        throw new Error('No actions recorded to generate test from');
      }
      
      // Enviar comando al background script para generar CSV manual
      const response = await chrome.runtime.sendMessage({
        action: 'generateTest',
        testType: 'manual-csv',
        outputFormat: 'csv-jira',
        exportType: 'manual', // Especificar tipo de export manual
        actions: AppState.recordedActions,
        customInstructions: 'Generate comprehensive manual test steps in CSV format compatible with Jira. Use MCP Chrome DevTools for robust step detection and MCP Playwright for selector validation.'
      });
      
      console.log('📋 [POPUP] Manual CSV response:', response);
      
      if (response && response.success) {
        UI.showNotification('Manual test CSV generated successfully!', 'success');
        console.log('📋 Manual CSV Test Generated:', {
          testContent: response.test,
          actionCount: AppState.recordedActions.length
        });
        
        // Descargar archivo CSV
        if (response.test) {
          this.triggerDownload(response.test, `manual-test-${Date.now()}.csv`);
        }
        
        if (response.result && response.result.downloadUrl) {
          this.triggerDownload(response.result.content, response.result.fileName);
        }
      } else {
        throw new Error(response?.error || 'Failed to generate manual CSV test');
      }
      
    } catch (error) {
      console.error('❌ Error generating manual CSV:', error);
      UI.showNotification('Failed to generate manual test: ' + error.message, 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Función auxiliar para descargar archivos
  triggerDownload(content, fileName) {
    try {
      const blob = new Blob([content], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('💾 File download triggered:', fileName);
    } catch (error) {
      console.error('❌ Error triggering download:', error);
    }
  },
  
  // Guardar test
  async saveTest() {
    try {
      UI.showLoading(true);
      
      const testData = {
        sessionId: AppState.currentSession,
        actions: AppState.recordedActions,
        timestamp: new Date().toISOString(),
        url: (await chrome.tabs.query({active: true, currentWindow: true}))[0]?.url
      };
      
      // Guardar en storage local - Mejorado para mayor robustez
      const { savedTests = [] } = await chrome.storage.local.get(['savedTests']);
      savedTests.push(testData);
      
      await chrome.storage.local.set({ savedTests });
      
      UI.showNotification('Test saved successfully', 'success');
      console.log('💾 Test saved');
      
    } catch (error) {
      console.error('❌ Error saving test:', error);
      UI.showNotification('Failed to save test', 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Ver tests guardados
  async viewTests() {
    try {
      chrome.tabs.create({
        url: chrome.runtime.getURL('config/config.html')
      });
    } catch (error) {
      console.error('❌ Error opening tests view:', error);
    }
  },
  
  // Abrir configuración
  async openConfig() {
    try {
      chrome.tabs.create({
        url: chrome.runtime.getURL('config/config.html')
      });
    } catch (error) {
      console.error('❌ Error opening config:', error);
    }
  },
  
  // Ver logs de debug
  async viewLogs() {
    try {
      // Obtener logs del background
      const response = await chrome.runtime.sendMessage({
        action: 'getLogs'
      });
      
      if (response?.logs) {
        console.log('📊 Debug Logs:', response.logs);
        // TODO: Mostrar logs en una ventana modal o nueva pestaña
      }
    } catch (error) {
      console.error('❌ Error getting logs:', error);
    }
  },
  
  // Test directo de API Gemini
  async testGeminiAPI() {
    try {
      console.log('🧪 [POPUP] Testing Gemini API directly...');
      const response = await chrome.runtime.sendMessage({
        action: 'testGeminiAPI'
      });
      
      console.log('🧪 [POPUP] Gemini API test result:', response);
      
      if (response && response.success) {
        UI.showNotification('Gemini API test successful!', 'success');
      } else {
        UI.showNotification(`Gemini API test failed: ${response?.error}`, 'error');
      }
    } catch (error) {
      console.error('❌ [POPUP] Error testing Gemini API:', error);
      UI.showNotification('Error testing Gemini API', 'error');
    }
  }
};

// Escuchar mensajes del background/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Popup received message:', message);
  
  switch (message.action) {
    case 'actionCaptured':
      AppState.recordedActions.push(message.action);
      AppState.update({});
      break;
      
    case 'recordingStatus':
      AppState.update({
        isRecording: message.isRecording,
        recordedActions: message.actions || AppState.recordedActions
      });
      break;
      
    default:
      console.log('🤷‍♂️ Unknown message action:', message.action);
  }
  
  sendResponse({ success: true });
});

// Actualizar tiempo de sesión cada segundo
setInterval(() => {
  // ...existing code...
});

// --- Inicialización del popup ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 [POPUP] Initializing popup...');
  
  UI.init();
  await AppState.loadFromStorage();
  AppState.updateUI?.(); // por si se llama desde AppState
  
  // Sincronizar estado inicial con background/content
  try {
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
    if (status?.success && status.status) {
      AppState.update({
        isRecording: status.status.isRecording,
        recordedActions: AppState.recordedActions,
        currentSession: status.status.sessionId || AppState.currentSession
      });
    }
  } catch (error) {
    console.log('ℹ️ [POPUP] Could not sync with background:', error.message);
  }
  
  console.log('✅ [POPUP] Popup initialized successfully');
});