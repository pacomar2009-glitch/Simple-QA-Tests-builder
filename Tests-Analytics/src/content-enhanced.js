// TestBuilder Pro - Enhanced Content Script
(function() {
console.log('🎬 [CONTENT] TestBuilder Pro Enhanced Loading... Timestamp:', new Date().toISOString());

// Verificar restricciones de CSP y URL
function checkPageCompatibility() {
  const restrictions = {
    csp: false,
    url: false,
    reason: ''
  };
  
  // Verificar URL
  const url = window.location.href;
  const restrictedUrls = [
    /^chrome:/,
    /^chrome-extension:/,
    /^moz-extension:/,
    /^about:/,
    /^file:/,
    /^data:/
  ];
  
  if (restrictedUrls.some(pattern => pattern.test(url))) {
    restrictions.url = true;
    restrictions.reason = 'Restricted URL type';
    return restrictions;
  }
  
  // Verificar CSP básico
  try {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (meta && meta.content) {
      const cspContent = meta.content.toLowerCase();
      if (cspContent.includes("script-src 'self'") && !cspContent.includes("'unsafe-inline'")) {
        restrictions.csp = true;
        restrictions.reason = 'Strict CSP detected';
      }
    }
  } catch (e) {
    // CSP check failed, pero continuamos
  }
  
  return restrictions;
}

// Evitar redeclaración del ContentLogger
if (typeof window.ContentLogger === 'undefined') {
  window.ContentLogger = {
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
}

// Usar referencia local para el resto del código
const ContentLogger = window.ContentLogger;

ContentLogger.log('info', 'Content script initialization started');

// Verificar compatibilidad de la página
const pageCompatibility = checkPageCompatibility();
if (pageCompatibility.url || pageCompatibility.csp) {
  ContentLogger.log('warning', 'Page compatibility issues detected', pageCompatibility);
  
  // Notificar al background sobre las restricciones
  try {
    chrome.runtime.sendMessage({
      action: 'pageRestrictions',
      restrictions: pageCompatibility
    }).catch(() => {
      // Silently fail si background no está disponible
    });
  } catch (e) {
    // Extension context might not be available
  }
}

class TestBuilderPro {
  constructor() {
    ContentLogger.log('info', 'TestBuilderPro constructor called');
    
    this.isRecording = false;
    this.isPaused = false;
    this.recordedActions = [];
    this.sessionId = null;
    this.sessionStartTime = null;
    
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
      this.restoreSession();
      
      ContentLogger.log('success', 'TestBuilderPro initialization completed');
    } catch (error) {
      ContentLogger.log('error', 'TestBuilderPro initialization failed', error);
    }
  }

  async restoreSession() {
    try {
      const response = await chrome.runtime.sendMessage({action: 'getSessionState'});
      if (response && response.sessionData) {
        this.isRecording = response.sessionData.isRecording || false;
        this.isPaused = response.sessionData.isPaused || false;
        this.recordedActions = response.sessionData.recordedActions || [];
        this.sessionId = response.sessionData.sessionId || null;
        this.sessionStartTime = response.sessionData.sessionStartTime || null;
        
        ContentLogger.log('success', 'Session restored', {
          isRecording: this.isRecording,
          actionsCount: this.recordedActions.length,
          sessionId: this.sessionId
        });
        
        if (this.isRecording) {
          this.setupRecording();
        }
      } else {
        this.sessionId = `session_${Date.now()}`;
        ContentLogger.log('info', 'No existing session, created new session ID', {sessionId: this.sessionId});
      }
    } catch (error) {
      ContentLogger.log('error', 'Failed to restore session', error);
      this.sessionId = `session_${Date.now()}`;
    }
  }

  startRecording() {
    ContentLogger.log('info', 'startRecording called');
    
    try {
      if (this.isRecording) {
        ContentLogger.log('warning', 'Recording already in progress');
        return;
      }
      
      this.isRecording = true;
      this.isPaused = false;
      this.sessionId = `session_${Date.now()}`;
      this.sessionStartTime = Date.now();
      this.recordedActions = []; // Reset actions for new recording
      
      ContentLogger.log('success', 'Recording started', {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      this.setupRecording();
      this.saveSessionState();
      
      // Notify popup of recording state
      this.notifyPopup('recordingStatus', {
        isRecording: true,
        actions: this.recordedActions,
        sessionId: this.sessionId
      });
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to start recording', error);
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
      this.sessionStartTime = null;
      
      ContentLogger.log('success', 'Recording stopped', {
        sessionId: this.sessionId,
        actionsCount: this.recordedActions.length,
        timestamp: new Date().toISOString()
      });
      
      // Remove event listeners
      this.removeRecordingListeners();
      
      this.saveSessionState();
      
      // Notify popup of recording state
      this.notifyPopup('recordingStatus', {
        isRecording: false,
        actions: this.recordedActions,
        sessionId: this.sessionId
      });
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to stop recording', error);
    }
  }

  pauseRecording() {
    ContentLogger.log('info', 'pauseRecording called', { 
      currentPauseState: this.isPaused 
    });
    
    try {
      if (!this.isRecording) {
        ContentLogger.log('warning', 'Cannot pause - no recording in progress');
        return;
      }
      
      this.isPaused = !this.isPaused;
      
      ContentLogger.log('success', 'Recording pause state changed', {
        isPaused: this.isPaused,
        sessionId: this.sessionId
      });
      
      this.saveSessionState();
      
      // Notify popup
      this.notifyPopup('recordingStatus', {
        isRecording: this.isRecording,
        isPaused: this.isPaused,
        actions: this.recordedActions,
        sessionId: this.sessionId
      });
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to pause/resume recording', error);
    }
  }

  setupRecording() {
    ContentLogger.log('info', 'setupRecording called');
    
    try {
      // Remove existing listeners first
      this.removeRecordingListeners();
      
      // Add new listeners
      this.clickHandler = this.recordClick.bind(this);
      this.inputHandler = this.recordInput.bind(this);
      this.keydownHandler = this.recordKeydown.bind(this);
      this.submitHandler = this.recordSubmit.bind(this);
      
      document.addEventListener('click', this.clickHandler, true);
      document.addEventListener('input', this.inputHandler, true);
      document.addEventListener('keydown', this.keydownHandler, true);
      document.addEventListener('submit', this.submitHandler, true);
      
      // Handle page unload
      this.beforeUnloadHandler = () => {
        if (this.isRecording) {
          ContentLogger.log('info', 'Page unloading, saving session state');
          this.saveSessionState();
        }
      };
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
      
      ContentLogger.log('success', 'Recording event listeners setup completed');
    } catch (error) {
      ContentLogger.log('error', 'Failed to setup recording', error);
    }
  }

  removeRecordingListeners() {
    try {
      if (this.clickHandler) {
        document.removeEventListener('click', this.clickHandler, true);
      }
      if (this.inputHandler) {
        document.removeEventListener('input', this.inputHandler, true);
      }
      if (this.keydownHandler) {
        document.removeEventListener('keydown', this.keydownHandler, true);
      }
      if (this.submitHandler) {
        document.removeEventListener('submit', this.submitHandler, true);
      }
      if (this.beforeUnloadHandler) {
        window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      }
      
      ContentLogger.log('success', 'Recording event listeners removed');
    } catch (error) {
      ContentLogger.log('error', 'Failed to remove recording listeners', error);
    }
  }

  recordClick(e) {
    if (!this.isRecording || this.isPaused) return;
    
    try {
      const action = {
        type: 'click',
        selector: this.getSelector(e.target),
        timestamp: Date.now(),
        url: window.location.href,
        text: e.target.textContent?.trim() || '',
        tagName: e.target.tagName,
        id: e.target.id || null,
        className: e.target.className || null
      };

      // Special handling for links
      if (e.target.tagName === 'A' || e.target.closest('a')) {
        const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
        action.href = link.href;
        action.type = 'navigation';
      }
      
      // Special handling for buttons
      if (e.target.tagName === 'BUTTON' || e.target.type === 'button' || e.target.type === 'submit') {
        action.type = 'button_click';
      }
      
      this.recordedActions.push(action);
      
      ContentLogger.log('debug', 'Click action recorded', {
        type: action.type,
        selector: action.selector,
        actionsCount: this.recordedActions.length
      });
      
      this.saveSessionState();
      this.notifyPopup('actionCaptured', action);
      
      // Enviar acción a n8n en tiempo real
      this.sendActionToN8n(action);
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to record click', error);
    }
  }

  recordInput(e) {
    if (!this.isRecording || this.isPaused) return;
    
    try {
      const action = {
        type: 'input',
        selector: this.getSelector(e.target),
        value: e.target.value,
        timestamp: Date.now(),
        url: window.location.href,
        inputType: e.target.type || 'text',
        placeholder: e.target.placeholder || null
      };
      
      this.recordedActions.push(action);
      
      ContentLogger.log('debug', 'Input action recorded', {
        type: action.type,
        selector: action.selector,
        valueLength: action.value?.length || 0,
        actionsCount: this.recordedActions.length
      });
      
      this.saveSessionState();
      this.notifyPopup('actionCaptured', action);
      
      // Enviar acción a n8n en tiempo real
      this.sendActionToN8n(action);
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to record input', error);
    }
  }

  recordKeydown(e) {
    if (!this.isRecording || this.isPaused) return;
    
    try {
      // Only record special keys
      if (['Enter', 'Tab', 'Escape'].includes(e.key)) {
        const action = {
          type: 'keydown',
          key: e.key,
          selector: this.getSelector(e.target),
          timestamp: Date.now(),
          url: window.location.href
        };
        
        this.recordedActions.push(action);
        
        ContentLogger.log('debug', 'Keydown action recorded', {
          key: action.key,
          selector: action.selector,
          actionsCount: this.recordedActions.length
        });
        
        this.saveSessionState();
        this.notifyPopup('actionCaptured', action);
        
        // Enviar acción a n8n en tiempo real
        this.sendActionToN8n(action);
      }
    } catch (error) {
      ContentLogger.log('error', 'Failed to record keydown', error);
    }
  }

  recordSubmit(e) {
    if (!this.isRecording || this.isPaused) return;
    
    try {
      const action = {
        type: 'submit',
        selector: this.getSelector(e.target),
        timestamp: Date.now(),
        url: window.location.href,
        formAction: e.target.action || null,
        formMethod: e.target.method || 'GET'
      };
      
      this.recordedActions.push(action);
      
      ContentLogger.log('debug', 'Submit action recorded', {
        selector: action.selector,
        actionsCount: this.recordedActions.length
      });
      
      this.saveSessionState();
      this.notifyPopup('actionCaptured', action);
      
      // Enviar acción a n8n en tiempo real
      this.sendActionToN8n(action);
      
    } catch (error) {
      ContentLogger.log('error', 'Failed to record submit', error);
    }
  }

  getSelector(el) {
    try {
      // Try ID first
      if (el.id) {
        return `#${el.id}`;
      }
      
      // Try data attributes
      if (el.dataset.testid) {
        return `[data-testid="${el.dataset.testid}"]`;
      }
      
      // Try class names (first meaningful class)
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) {
          return `.${classes[0]}`;
        }
      }
      
      // Try name attribute
      if (el.name) {
        return `[name="${el.name}"]`;
      }
      
      // Try aria-label
      if (el.getAttribute('aria-label')) {
        return `[aria-label="${el.getAttribute('aria-label')}"]`;
      }
      
      // Fall back to tag name with nth-child
      const tagName = el.tagName.toLowerCase();
      const parent = el.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName.toLowerCase() === tagName
        );
        const index = siblings.indexOf(el) + 1;
        return `${tagName}:nth-child(${index})`;
      }
      
      return tagName;
    } catch (error) {
      ContentLogger.log('error', 'Failed to generate selector', error);
      return el.tagName?.toLowerCase() || 'unknown';
    }
  }

  saveSessionState() {
    try {
      chrome.runtime.sendMessage({
        action: 'saveSessionState',
        sessionData: {
          isRecording: this.isRecording,
          isPaused: this.isPaused,
          recordedActions: this.recordedActions,
          sessionId: this.sessionId,
          sessionStartTime: this.sessionStartTime,
          currentUrl: window.location.href
        }
      });
    } catch (error) {
      ContentLogger.log('error', 'Failed to save session state', error);
    }
  }

  notifyPopup(action, data) {
    try {
      chrome.runtime.sendMessage({
        action: action,
        ...data
      });
    } catch (error) {
      ContentLogger.log('warning', 'Could not notify popup', { action, error });
    }
  }

  // ===== REAL-TIME N8N INTEGRATION =====
  async sendActionToN8n(action) {
    // Verificar si la integración n8n está habilitada
    try {
      const result = await chrome.storage.local.get(['n8nIntegrationEnabled']);
      if (result.n8nIntegrationEnabled === false) {
        return; // n8n integration disabled
      }
    } catch (error) {
      ContentLogger.log('warning', 'Could not check n8n settings', error);
      return;
    }

    const n8nActionWebhook = 'http://localhost:5678/webhook/action-capture-fixed';
    
    try {
      const payload = {
        ...action,
        sessionId: this.sessionId,
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent
      };

      ContentLogger.log('debug', 'Sending action to n8n', {
        actionType: action.type,
        sessionId: this.sessionId,
        webhook: n8nActionWebhook
      });

      const response = await fetch(n8nActionWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });

      if (response.ok) {
        const result = await response.json();
        ContentLogger.log('success', 'Action sent to n8n successfully', {
          actionType: action.type,
          sessionId: result.sessionId,
          responseTime: Date.now() - action.timestamp
        });
      } else {
        ContentLogger.log('warning', 'n8n webhook response error', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      // No fallar el proceso principal si n8n no está disponible
      ContentLogger.log('debug', 'n8n action sending failed (non-critical)', {
        error: error.message,
        actionType: action.type
      });
    }
  }

  generateTest() {
    ContentLogger.log('info', 'generateTest called');
    
    try {
      if (this.recordedActions.length === 0) {
        ContentLogger.log('warning', 'No actions to generate test from');
        return null;
      }
      
      const testData = {
        sessionId: this.sessionId,
        actions: this.recordedActions,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title
      };
      
      ContentLogger.log('success', 'Test data generated', {
        actionsCount: this.recordedActions.length,
        sessionId: this.sessionId
      });
      
      return testData;
    } catch (error) {
      ContentLogger.log('error', 'Failed to generate test', error);
      return null;
    }
  }

  exportPlaywright() {
    ContentLogger.log('info', 'exportPlaywright called');
    
    try {
      const testCode = this.generatePlaywrightTest();
      
      if (testCode) {
        const blob = new Blob([testCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `playwright-test-${this.sessionId || Date.now()}.spec.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        ContentLogger.log('success', 'Playwright test exported');
        return true;
      }
      
      return false;
    } catch (error) {
      ContentLogger.log('error', 'Failed to export Playwright test', error);
      return false;
    }
  }

  generatePlaywrightTest() {
    if (this.recordedActions.length === 0) return null;
    
    const url = this.recordedActions[0]?.url || window.location.href;
    const title = document.title.replace(/[^a-zA-Z0-9]/g, '_');
    
    let code = `import { test, expect } from '@playwright/test';\n\n`;
    code += `test('Generated test for ${title}', async ({ page }) => {\n`;
    code += `  await page.goto('${url}');\n\n`;
    
    this.recordedActions.forEach((action, index) => {
      switch (action.type) {
        case 'click':
        case 'button_click':
          code += `  await page.click('${action.selector}');\n`;
          break;
        case 'navigation':
          if (action.href) {
            code += `  await page.click('${action.selector}'); // Navigate to ${action.href}\n`;
          }
          break;
        case 'input':
          code += `  await page.fill('${action.selector}', '${action.value || ''}');\n`;
          break;
        case 'keydown':
          if (action.key === 'Enter') {
            code += `  await page.press('${action.selector}', 'Enter');\n`;
          }
          break;
        case 'submit':
          code += `  await page.click('${action.selector} [type="submit"]');\n`;
          break;
      }
      
      // Add wait after each action for stability
      if (index < this.recordedActions.length - 1) {
        code += `  await page.waitForTimeout(500);\n`;
      }
    });
    
    code += `\n  // Add assertions here\n`;
    code += `  // await expect(page).toHaveTitle(/expected title/i);\n`;
    code += `});\n`;
    
    return code;
  }
}

// Prevenir múltiples inicializaciones del content script
if (typeof window.testBuilderInstance === 'undefined') {
  
  // Crear instancia global
  let testBuilderInstance = null;

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.testBuilderInstance) {
        testBuilderInstance = new TestBuilderPro();
        window.TestBuilder = testBuilderInstance;
        window.testBuilderInstance = testBuilderInstance;
        ContentLogger.log('success', 'TestBuilderPro initialized on DOMContentLoaded');
      }
    });
  } else {
    if (!window.testBuilderInstance) {
      testBuilderInstance = new TestBuilderPro();
      window.TestBuilder = testBuilderInstance;
      window.testBuilderInstance = testBuilderInstance;
      ContentLogger.log('success', 'TestBuilderPro initialized immediately');
    }
  }

  // Escuchar mensajes del popup y background (solo una vez)
  if (!window.testBuilderMessageListener) {
    window.testBuilderMessageListener = (message, sender, sendResponse) => {
      ContentLogger.log('info', 'Content script received message', {
        action: message.action,
        sender: sender.tab ? `tab-${sender.tab.id}` : 'popup'
      });
      
      const instance = window.testBuilderInstance || testBuilderInstance;
      if (!instance) {
        ContentLogger.log('error', 'TestBuilderPro not initialized');
        sendResponse({ success: false, error: 'TestBuilderPro not initialized' });
        return true;
      }
      
      try {
        switch (message.action) {
          case 'startRecording':
            instance.startRecording();
            ContentLogger.log('success', 'Recording started via message');
            sendResponse({ success: true, message: 'Recording started' });
            break;
            
          case 'stopRecording':
            instance.stopRecording();
            ContentLogger.log('success', 'Recording stopped via message');
            sendResponse({ success: true, message: 'Recording stopped' });
            break;
            
          case 'pauseRecording':
            instance.pauseRecording();
            ContentLogger.log('success', 'Recording paused/resumed via message');
            sendResponse({ success: true, message: 'Recording paused/resumed' });
            break;
            
          case 'generateTest':
            const testData = instance.generateTest();
            if (testData) {
              ContentLogger.log('success', 'Test generated via message');
              sendResponse({ success: true, testData: testData });
            } else {
              sendResponse({ success: false, error: 'No actions to generate test from' });
            }
            break;
            
          case 'exportPlaywright':
            const exported = instance.exportPlaywright();
            if (exported) {
              ContentLogger.log('success', 'Playwright test exported via message');
              sendResponse({ success: true, message: 'Playwright test exported' });
            } else {
              sendResponse({ success: false, error: 'Failed to export test' });
            }
            break;
            
          case 'getStatus':
            const status = {
              isRecording: instance.isRecording,
              isPaused: instance.isPaused,
              actionsCount: instance.recordedActions?.length || 0,
              sessionId: instance.sessionId
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
    };
    
    chrome.runtime.onMessage.addListener(window.testBuilderMessageListener);
  }
} else {
  ContentLogger.log('info', 'TestBuilderPro already initialized, skipping initialization');
}

ContentLogger.log('success', 'TestBuilder Pro Enhanced Content Script Loaded');
console.log('🚀 TestBuilder Pro Enhanced Content Script Loaded');
})();