// TestBuilder Pro - Enhanced Content Script con Debug Avanzado
console.log('🎬 [CONTENT] TestBuilder Pro Enhanced Loading... Timestamp:', new Date().toISOString());

// Sistema de logging para content script
const ContentLogger = {
  logs: [],
  
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data, url: window.location.href };
    this.logs.push(logEntry);
    
    const emoji = {
      'info': 'ℹ️',
      'success': '✅', 
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    };
    
    console.log(`${emoji[level]} [CONTENT] ${message}`, data || '');
    
    // Enviar logs críticos al background
    if (level === 'error' || level === 'warning') {
      try {
        chrome.runtime.sendMessage({
          action: 'debugLog',
          log: { ...logEntry, component: 'CONTENT' }
        }).catch(() => {}); // Silently fail if background not available
      } catch (e) {
        // Background might not be available
      }
    }
    
    // Mantener solo los últimos 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
  }
};

ContentLogger.log('info', 'Content script initialization started');

class TestBuilderPro {
  constructor() {
    ContentLogger.log('info', 'TestBuilderPro constructor called');
    
    this.isRecording = false;
    this.isPaused = false;
    this.recordedActions = [];
    this.sessionId = null;
    
    ContentLogger.log('debug', 'Initial state set', {
      isRecording: this.isRecording,
      isPaused: this.isPaused,
      actionsCount: this.recordedActions.length
    });
    
    this.init();
  }

  init() {
    ContentLogger.log('info', 'TestBuilderPro initialization started');
    
    try {
      this.createPanel();
      this.setupEvents();
      this.addStyles();
      this.restoreSession();
      
      ContentLogger.log('success', 'TestBuilderPro initialization completed');
      console.log('TestBuilder Pro loaded');
    } catch (error) {
      ContentLogger.log('error', 'TestBuilderPro initialization failed', error);
    }
  }

  restoreSession() {
    chrome.runtime.sendMessage({action: 'getSessionState'}, (response) => {
      if (response && response.sessionData) {
        this.isRecording = response.sessionData.isRecording || false;
        this.isPaused = response.sessionData.isPaused || false;
        this.recordedActions = response.sessionData.recordedActions || [];
        this.sessionId = response.sessionData.sessionId || Date.now();
        
        if (this.isRecording) {
          this.restoreRecordingUI();
        }
        this.updateCount();
      } else {
        this.sessionId = Date.now();
      }
    });
  }

  restoreRecordingUI() {
    if (this.isRecording) {
      document.getElementById('status').textContent = this.isPaused ? 'Paused' : 'Recording...';
      document.getElementById('start-btn').disabled = true;
      document.getElementById('pause-btn').disabled = false;
      document.getElementById('stop-btn').disabled = false;
      
      if (!this.indicator) {
        this.indicator = document.createElement('div');
        this.indicator.className = 'recording-indicator';
        this.indicator.textContent = ' REC';
        document.body.appendChild(this.indicator);
      }
      
      this.setupRecording();
      this.updateCount();
    }
  }

  saveSessionState() {
    chrome.runtime.sendMessage({
      action: 'saveSessionState',
      sessionData: {
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        recordedActions: this.recordedActions,
        sessionId: this.sessionId,
        currentUrl: window.location.href
      }
    });
  }

  createPanel() {
    this.panel = document.createElement('div');
    this.panel.id = 'testbuilder-panel';
    this.panel.innerHTML = `
      <div style="position:fixed;top:20px;right:20px;width:250px;background:#333;color:white;padding:15px;border-radius:8px;z-index:999999;font-family:Arial;">
        <h3> TestBuilder Pro</h3>
        <div id="status">Ready</div>
        <button id="start-btn">Start Recording</button>
        <button id="pause-btn" disabled>Pause</button>
        <button id="stop-btn" disabled>Stop</button>
        <button id="save-btn" disabled>Save Test</button>
        <div>Actions: <span id="count">0</span></div>
      </div>
    `;
    document.body.appendChild(this.panel);
  }

  setupEvents() {
    document.getElementById('start-btn').onclick = () => this.startRecording();
    document.getElementById('pause-btn').onclick = () => this.pauseRecording();
    document.getElementById('stop-btn').onclick = () => this.stopRecording();
    document.getElementById('save-btn').onclick = () => this.saveTest();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #testbuilder-panel button { margin:5px; padding:8px; border:none; border-radius:4px; cursor:pointer; }
      #testbuilder-panel button:disabled { opacity:0.5; cursor:not-allowed; }
      .recording-indicator { 
        position:fixed; top:10px; left:10px; background:#ff4444; color:white; 
        padding:8px 12px; border-radius:20px; z-index:999998; 
        font-weight:bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  startRecording() {
    ContentLogger.log('info', 'startRecording called');
    
    try {
      if (this.isRecording) {
        ContentLogger.log('warning', 'Recording already in progress');
        return;
      }
      
      this.isRecording = true;
      this.sessionId = Date.now().toString();
      
      ContentLogger.log('success', 'Recording started', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      document.getElementById('status').textContent = 'Recording...';
      document.getElementById('start-btn').disabled = true;
      document.getElementById('pause-btn').disabled = false;
      document.getElementById('stop-btn').disabled = false;
      
      this.indicator = document.createElement('div');
      this.indicator.className = 'recording-indicator';
      this.indicator.textContent = ' REC';
      document.body.appendChild(this.indicator);
      
      this.setupRecording();
      this.saveSessionState();
    } catch (error) {
      ContentLogger.log('error', 'Failed to start recording', error);
    }
  }

  setupRecording() {
    ContentLogger.log('info', 'setupRecording called');
    
    try {
      document.addEventListener('click', this.recordClick.bind(this), true);
      document.addEventListener('input', this.recordInput.bind(this), true);
      
      window.addEventListener('beforeunload', () => {
        if (this.isRecording) {
          ContentLogger.log('info', 'Page unloading, saving session state');
          this.saveSessionState();
        }
      });
      
      ContentLogger.log('success', 'Recording event listeners setup completed');
    } catch (error) {
      ContentLogger.log('error', 'Failed to setup recording', error);
    }
  }

  recordClick(e) {
    if (!this.isRecording || this.isPaused || e.target.closest('#testbuilder-panel')) return;
    
    try {
      const action = {
        type: 'click',
        selector: this.getSelector(e.target),
        timestamp: Date.now(),
        url: window.location.href,
        text: e.target.textContent?.trim() || ''
      };

      if (e.target.tagName === 'A' || e.target.closest('a')) {
        const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
        action.href = link.href;
        action.type = 'navigation';
      }
      
      this.recordedActions.push(action);
      
      ContentLogger.log('debug', 'Click action recorded', {
        type: action.type,
        selector: action.selector,
        actionsCount: this.recordedActions.length
      });
      
      this.updateCount();
      this.saveSessionState();
    } catch (error) {
      ContentLogger.log('error', 'Failed to record click', error);
    }
  }

  recordInput(e) {
    if (!this.isRecording || this.isPaused || e.target.closest('#testbuilder-panel')) return;
    
    try {
      const action = {
        type: 'input',
        selector: this.getSelector(e.target),
        value: e.target.value,
        timestamp: Date.now(),
        url: window.location.href
      };
      
      this.recordedActions.push(action);
      
      ContentLogger.log('debug', 'Input action recorded', {
        type: action.type,
        selector: action.selector,
        valueLength: action.value?.length || 0,
        actionsCount: this.recordedActions.length
      });
      
      this.updateCount();
      this.saveSessionState();
    } catch (error) {
      ContentLogger.log('error', 'Failed to record input', error);
    }
  }

  getSelector(el) {
    if (el.id) return '#' + el.id;
    if (el.className) return '.' + el.className.split(' ')[0];
    return el.tagName.toLowerCase();
  }

  pauseRecording() {
    ContentLogger.log('info', 'pauseRecording called', { 
      currentPauseState: this.isPaused 
    });
    
    try {
      this.isPaused = !this.isPaused;
      document.getElementById('status').textContent = this.isPaused ? 'Paused' : 'Recording...';
      
      ContentLogger.log('success', 'Recording pause state changed', {
        isPaused: this.isPaused,
        sessionId: this.sessionId
      });
      
      this.saveSessionState();
    } catch (error) {
      ContentLogger.log('error', 'Failed to pause/resume recording', error);
    }
  }

  stopRecording() {
    ContentLogger.log('info', 'stopRecording called');
    
    try {
      if (!this.isRecording) {
        ContentLogger.log('warning', 'No recording in progress');
        return;
      }
      
      this.isRecording = false;
      this.isPaused = false;
      
      ContentLogger.log('success', 'Recording stopped', {
        sessionId: this.sessionId,
        actionsCount: this.recordedActions.length,
        timestamp: new Date().toISOString()
      });
      
      // Update UI
      document.getElementById('status').textContent = `Stopped (${this.recordedActions.length} actions)`;
      document.getElementById('start-btn').disabled = false;
      document.getElementById('pause-btn').disabled = true;
      document.getElementById('stop-btn').disabled = true;
      document.getElementById('save-btn').disabled = false;
      
      // Remove recording indicator
      if (this.indicator) {
        this.indicator.remove();
        this.indicator = null;
      }
      
      // Remove event listeners
      document.removeEventListener('click', this.recordClick.bind(this), true);
      document.removeEventListener('input', this.recordInput.bind(this), true);
      
      this.saveSessionState();
      
      // Notify popup
      try {
        chrome.runtime.sendMessage({
          action: 'recordingStatus',
          isRecording: false,
          actions: this.recordedActions,
          sessionId: this.sessionId
        });
      } catch (e) {
        ContentLogger.log('warning', 'Could not notify popup of recording stop', e);
      }
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to stop recording', error);
    }
  }

  saveTest() {
    ContentLogger.log('info', 'saveTest called');
    
    try {
      const testData = {
        sessionId: this.sessionId,
        actions: this.recordedActions,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title
      };
      
      // Send to background for storage
      chrome.runtime.sendMessage({
        action: 'saveTest',
        testData: testData
      }, (response) => {
        if (response?.success) {
          ContentLogger.log('success', 'Test saved successfully');
          document.getElementById('status').textContent = 'Test Saved!';
        } else {
          ContentLogger.log('error', 'Failed to save test', response?.error);
        }
      });
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to save test', error);
    }
  }
      document.getElementById('pause-btn').textContent = this.isPaused ? 'Resume' : 'Pause';
      
      ContentLogger.log('success', 'Recording pause state changed', {
        isPaused: this.isPaused,
        status: this.isPaused ? 'Paused' : 'Recording'
      });
      
      this.saveSessionState();
    } catch (error) {
      ContentLogger.log('error', 'Failed to pause/resume recording', error);
    }
  }

  stopRecording() {
    ContentLogger.log('info', 'stopRecording called');
    
    try {
      if (!this.isRecording) {
        ContentLogger.log('warning', 'No recording in progress');
        return;
      }
      
      this.isRecording = false;
      this.isPaused = false;
      
      ContentLogger.log('success', 'Recording stopped', {
        sessionId: this.sessionId,
        actionsRecorded: this.recordedActions?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      document.getElementById('status').textContent = 'Stopped';
      document.getElementById('start-btn').disabled = false;
      document.getElementById('pause-btn').disabled = true;
      document.getElementById('stop-btn').disabled = true;
      document.getElementById('save-btn').disabled = false;
      
      if (this.indicator) {
        this.indicator.remove();
        ContentLogger.log('debug', 'Recording indicator removed');
      }
      
      chrome.runtime.sendMessage({ action: 'clearSession' });
    } catch (error) {
      ContentLogger.log('error', 'Failed to stop recording', error);
    }
  }

  saveTest() {
    ContentLogger.log('info', 'saveTest called');
    
    try {
      if (!this.recordedActions || this.recordedActions.length === 0) {
        ContentLogger.log('warning', 'No actions recorded to save');
        alert('No actions recorded to save');
        return;
      }
      
      const testCode = this.generatePlaywrightTest();
      const blob = new Blob([testCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-${this.sessionId}.spec.js`;
      a.click();
      URL.revokeObjectURL(url);
      
      ContentLogger.log('success', 'Test file saved', {
        sessionId: this.sessionId,
        actionsCount: this.recordedActions.length,
        filename: `test-${this.sessionId}.spec.js`
      });
    } catch (error) {
      ContentLogger.log('error', 'Failed to save test', error);
    }
  }

  generatePlaywrightTest() {
    let code = `const { test, expect } = require('@playwright/test');

test('Generated test', async ({ page }) => {
  await page.goto('${this.recordedActions[0]?.url || window.location.href}');
  
`;
    
    let currentUrl = this.recordedActions[0]?.url || window.location.href;
    
    this.recordedActions.forEach(action => {
      if (action.url !== currentUrl) {
        code += `  await page.goto('${action.url}');\n`;
        currentUrl = action.url;
      }
      
      if (action.type === 'click' || action.type === 'navigation') {
        code += `  await page.click('${action.selector}');\n`;
        if (action.href && !action.href.startsWith('#')) {
          code += `  await page.waitForLoadState();\n`;
        }
      } else if (action.type === 'input') {
        code += `  await page.fill('${action.selector}', '${action.value}');\n`;
      }
    });
    
    code += `});`;
    return code;
  }

  updateCount() {
    const countElement = document.getElementById('count');
    if (countElement) {
      countElement.textContent = this.recordedActions.length;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TestBuilderPro());
} else {
  new TestBuilderPro();
}

window.testBuilderPro = new TestBuilderPro();

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ContentLogger.log('info', 'Content script received message', {
    action: message.action,
    sender: sender.tab ? `tab-${sender.tab.id}` : 'popup'
  });
  
  if (!window.testBuilderPro) {
    ContentLogger.log('error', 'TestBuilderPro not initialized');
    sendResponse({ success: false, error: 'TestBuilderPro not initialized' });
    return;
  }
  
  try {
    switch (message.action) {
      case 'startRecording':
        window.testBuilderPro.startRecording();
        ContentLogger.log('success', 'Recording started via message');
        sendResponse({ success: true, message: 'Recording started' });
        break;
        
      case 'stopRecording':
        window.testBuilderPro.stopRecording();
        ContentLogger.log('success', 'Recording stopped via message');
        sendResponse({ success: true, message: 'Recording stopped' });
        break;
        
      case 'pauseRecording':
        window.testBuilderPro.pauseRecording();
        ContentLogger.log('success', 'Recording paused/resumed via message');
        sendResponse({ success: true, message: 'Recording paused/resumed' });
        break;
        
      case 'saveTest':
        window.testBuilderPro.saveTest();
        ContentLogger.log('success', 'Test saved via message');
        sendResponse({ success: true, message: 'Test saved' });
        break;
        
      case 'exportPlaywright':
        try {
          const testCode = window.testBuilderPro.generatePlaywrightTest();
          const blob = new Blob([testCode], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `playwright-test-${Date.now()}.spec.js`;
          a.click();
          URL.revokeObjectURL(url);
          ContentLogger.log('success', 'Playwright test exported');
          sendResponse({ success: true, message: 'Playwright test exported' });
        } catch (error) {
          ContentLogger.log('error', 'Failed to export Playwright test', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'exportJira':
        try {
          // Exportar en formato CSV para Jira
          const csvData = window.testBuilderPro.recordedActions.map((action, index) => {
            return `"TC-${index + 1}","${action.type}","${action.selector}","${action.text || action.value || ''}","${action.url}"`;
          }).join('\n');
          
          const csvBlob = new Blob([`"ID","Action","Selector","Text","URL"\n${csvData}`], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = `jira-test-cases-${Date.now()}.csv`;
          csvLink.click();
          URL.revokeObjectURL(csvUrl);
          ContentLogger.log('success', 'Jira CSV exported');
          sendResponse({ success: true, message: 'Jira CSV exported' });
        } catch (error) {
          ContentLogger.log('error', 'Failed to export Jira CSV', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'getStatus':
        const status = {
          isRecording: window.testBuilderPro.isRecording,
          isPaused: window.testBuilderPro.isPaused,
          actionsCount: window.testBuilderPro.recordedActions?.length || 0,
          sessionId: window.testBuilderPro.sessionId
        };
        ContentLogger.log('debug', 'Status requested', status);
        sendResponse({ success: true, status });
        break;
        
      default:
        ContentLogger.log('warning', 'Unknown action received', { action: message.action });
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    ContentLogger.log('error', 'Error handling message', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Importante para mantener el canal de respuesta abierto
});

ContentLogger.log('success', 'TestBuilder Pro Enhanced Content Script Loaded');
console.log('🚀 TestBuilder Pro Enhanced Content Script Loaded');
