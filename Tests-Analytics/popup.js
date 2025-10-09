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
  async generateWithAI() {
    try {
      UI.showLoading(true);
      
      // Enviar comando al background script en lugar del content script
      const response = await chrome.runtime.sendMessage({
        action: 'generateTest',
        actions: AppState.recordedActions
      });
      
      if (response && response.success) {
        UI.showNotification('Test generated with AI!', 'success');
        console.log('🤖 Test generated with AI');
      } else {
        throw new Error(response?.error || 'Failed to generate test');
      }
      
    } catch (error) {
      console.error('❌ Error generating test:', error);
      UI.showNotification('Failed to generate test', 'error');
    } finally {
      UI.showLoading(false);
    }
  },
  
  // Exportar a Playwright
  async exportPlaywright() {
    try {
      UI.showLoading(true);
      
      // Enviar comando al background script
      const response = await chrome.runtime.sendMessage({
        action: 'exportPlaywright',
        actions: AppState.recordedActions
      });
      
      if (response && response.success) {
        UI.showNotification('Playwright test exported!', 'success');
        console.log('📝 Exporting to Playwright');
      } else {
        throw new Error(response?.error || 'Failed to export test');
      }
      
    } catch (error) {
      console.error('❌ Error exporting:', error);
      UI.showNotification('Failed to export test', 'error');
    } finally {
      UI.showLoading(false);
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
      
      // Guardar en storage local
      const savedTests = await chrome.storage.local.get(['savedTests']) || [];
      savedTests.savedTests = savedTests.savedTests || [];
      savedTests.savedTests.push(testData);
      
      await chrome.storage.local.set(savedTests);
      
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
  if (AppState.isRecording) {
    UI.updateSessionTime();
  }
}, 1000);

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  console.log('✅ Popup DOM loaded');
  
  try {
    UI.init();
    await AppState.loadFromStorage();
    AppState.updateUI();
    
    console.log('🚀 Popup initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing popup:', error);
  }
});

console.log('🧪 [POPUP] TestBuilder Popup Script Loaded');