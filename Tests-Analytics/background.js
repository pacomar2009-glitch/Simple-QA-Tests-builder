// TestBuilder Background Script con Debug Avanzado
console.log('🚀 [BACKGROUND] TestBuilder Background Script Loading... Timestamp:', new Date().toISOString());

// Sistema de logging centralizado
const BackgroundLogger = {
  logs: [],
  
  log(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, component, message, data };
    this.logs.push(logEntry);
    
    const emoji = {
      'info': 'ℹ️',
      'success': '✅', 
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍'
    };
    
    console.log(`${emoji[level]} [${component}] ${message}`, data || '');
    
    // Mantener solo los últimos 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  },
  
  getAllLogs() {
    return this.logs;
  },
  
  getLogsByComponent(component) {
    return this.logs.filter(log => log.component === component);
  }
};

BackgroundLogger.log('info', 'BACKGROUND', 'Background script initialized');

// Función para validar URLs permitidas
function isValidUrl(url) {
  BackgroundLogger.log('debug', 'URL_VALIDATOR', 'Checking URL validity', { url });
  
  if (!url) {
    BackgroundLogger.log('warning', 'URL_VALIDATOR', 'Empty URL provided');
    return false;
  }
  
  const restrictedPatterns = [
    { pattern: /^chrome:/, reason: 'Chrome internal pages' },
    { pattern: /^chrome-extension:/, reason: 'Extension pages' },
    { pattern: /^moz-extension:/, reason: 'Firefox extension pages' },
    { pattern: /^ms-browser-extension:/, reason: 'Edge extension pages' },
    { pattern: /^about:/, reason: 'Browser about pages' },
    { pattern: /^file:/, reason: 'Local file system' },
    { pattern: /^data:/, reason: 'Data URLs' },
    { pattern: /^blob:/, reason: 'Blob URLs' }
  ];
  
  const restriction = restrictedPatterns.find(r => r.pattern.test(url));
  
  BackgroundLogger.log('debug', 'URL_VALIDATOR', 'URL validation result', {
    url,
    isValid: !restriction,
    restriction: restriction?.reason || 'None'
  });
  
  return !restriction;
}

// Función para limpiar y crear menús contextuales de forma segura
function setupContextMenus() {
  BackgroundLogger.log('info', 'MENU_SETUP', 'Setting up context menus');
  
  // Primero eliminar todos los menús existentes de forma más robusta
  chrome.contextMenus.removeAll(() => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('warning', 'MENU_SETUP', 'Error removing existing menus', chrome.runtime.lastError);
    } else {
      BackgroundLogger.log('info', 'MENU_SETUP', 'Existing menus removed successfully');
    }
    
    // Esperar más tiempo para asegurar la limpieza completa
    setTimeout(() => {
      createMenusSequentially();
    }, 500);
  });
}

// Función para crear menús de forma secuencial para evitar conflictos
function createMenusSequentially() {
  const menuItems = [
    {
      id: 'testbuilder-start',
      title: '🎬 Start TestBuilder Recording',
      contexts: ['page']
    },
    {
      id: 'testbuilder-generate', 
      title: '🤖 Generate Test with AI',
      contexts: ['page']
    }
  ];
  
  let currentIndex = 0;
  
  function createNextMenu() {
    if (currentIndex >= menuItems.length) {
      BackgroundLogger.log('success', 'MENU_SETUP', 'All context menus created successfully');
      return;
    }
    
    const item = menuItems[currentIndex];
    chrome.contextMenus.create(item, () => {
      if (chrome.runtime.lastError) {
        BackgroundLogger.log('error', 'MENU_SETUP', `Failed to create menu ${item.id}`, chrome.runtime.lastError);
      } else {
        BackgroundLogger.log('success', 'MENU_SETUP', `Menu ${item.id} created successfully`);
      }
      
      currentIndex++;
      // Esperar antes de crear el siguiente menú
      setTimeout(createNextMenu, 100);
    });
  }
  
  createNextMenu();
}

// Función segura para inyectar scripts
function safeScriptInjection(tabId, callback) {
  BackgroundLogger.log('info', 'SCRIPT_INJECTOR', 'Attempting safe script injection', { tabId });
  
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('error', 'SCRIPT_INJECTOR', 'Error accessing tab', {
        tabId,
        error: chrome.runtime.lastError.message
      });
      return;
    }
    
    BackgroundLogger.log('debug', 'SCRIPT_INJECTOR', 'Tab info retrieved', {
      tabId,
      url: tab.url,
      title: tab.title
    });
    
    if (!isValidUrl(tab.url)) {
      BackgroundLogger.log('warning', 'SCRIPT_INJECTOR', 'Cannot inject into restricted URL', {
        tabId,
        url: tab.url
      });
      return;
    }
    
    BackgroundLogger.log('success', 'SCRIPT_INJECTOR', 'URL validated, proceeding with callback');
    callback(tab);
  });
}

// Service Worker para TestBuilder
chrome.runtime.onInstalled.addListener((details) => {
  BackgroundLogger.log('success', 'INSTALLER', 'Extension installed/updated', {
    reason: details.reason,
    previousVersion: details.previousVersion
  });
  
  // Configuración inicial
  const initialConfig = {
    isRecording: false,
    capturedSteps: [],
    aiProvider: 'openai',
    customInstructions: 'Generate comprehensive test cases focusing on user workflows and edge cases.',
    installTimestamp: Date.now(),
    version: chrome.runtime.getManifest().version
  };
  
  chrome.storage.local.set(initialConfig, () => {
    if (chrome.runtime.lastError) {
      BackgroundLogger.log('error', 'INSTALLER', 'Failed to set initial storage', chrome.runtime.lastError);
    } else {
      BackgroundLogger.log('success', 'INSTALLER', 'Initial configuration saved', initialConfig);
    }
  });
  
  // Configurar menús contextuales solo en instalación
  initializeMenusOnce();
});

// Manejo de mensajes desde content script y popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderInfo = {
    tab: sender.tab?.id,
    url: sender.tab?.url,
    frameId: sender.frameId
  };
  
  BackgroundLogger.log('info', 'MESSAGE_HANDLER', 'Message received', {
    action: request.action,
    sender: senderInfo,
    data: request
  });
  
  switch (request.action) {
    case 'ping':
      BackgroundLogger.log('success', 'MESSAGE_HANDLER', 'Ping received, responding with pong');
      sendResponse({ 
        status: 'success', 
        message: 'pong from background',
        timestamp: Date.now()
      });
      break;
      
    case 'debugLog':
      BackgroundLogger.log('debug', 'LOG_COLLECTOR', 'Log received from component', request.log);
      sendResponse({ received: true });
      break;
      
    case 'captureStep':
      chrome.storage.local.get(['capturedSteps'], (result) => {
        const steps = result.capturedSteps || [];
        steps.push(request.step);
        
        chrome.storage.local.set({ capturedSteps: steps }, () => {
          if (chrome.runtime.lastError) {
            BackgroundLogger.log('error', 'STEP_CAPTURE', 'Failed to save step', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            BackgroundLogger.log('success', 'STEP_CAPTURE', 'Step captured and saved', {
              step: request.step,
              totalSteps: steps.length
            });
            sendResponse({ success: true, totalSteps: steps.length });
          }
        });
      });
      return true;
      
    case 'saveSessionState':
      const sessionData = {
        ...request.sessionData,
        lastSaveTime: Date.now(),
        backgroundVersion: chrome.runtime.getManifest().version
      };
      
      chrome.storage.local.set({ sessionData }, () => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_SAVER', 'Failed to save session', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_SAVER', 'Session state saved', sessionData);
          sendResponse({ success: true });
        }
      });
      break;
      
    case 'getSessionState':
      chrome.storage.local.get(['sessionData'], (result) => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_LOADER', 'Failed to get session', chrome.runtime.lastError);
          sendResponse({ sessionData: null, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_LOADER', 'Session state retrieved', result.sessionData);
          sendResponse({ sessionData: result.sessionData });
        }
      });
      return true;
      
    case 'clearSession':
      chrome.storage.local.set({ 
        sessionData: null,
        isRecording: false,
        capturedSteps: []
      }, () => {
        if (chrome.runtime.lastError) {
          BackgroundLogger.log('error', 'SESSION_CLEARER', 'Failed to clear session', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          BackgroundLogger.log('success', 'SESSION_CLEARER', 'Session cleared successfully');
          sendResponse({ success: true });
        }
      });
      break;
      
    case 'saveTest':
      const testData = {
        ...request.testData,
        savedTime: Date.now(),
        id: `test_${Date.now()}`
      };
      
      chrome.storage.local.get(['savedTests'], (result) => {
        const savedTests = result.savedTests || [];
        savedTests.push(testData);
        
        chrome.storage.local.set({ savedTests }, () => {
          if (chrome.runtime.lastError) {
            BackgroundLogger.log('error', 'TEST_SAVER', 'Failed to save test', chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            BackgroundLogger.log('success', 'TEST_SAVER', 'Test saved successfully', {
              testId: testData.id,
              actionsCount: testData.actions?.length || 0
            });
            sendResponse({ success: true, testId: testData.id });
          }
        });
      });
      return true;
      
    case 'getLogs':
      const component = request.component;
      const logs = component ? 
        BackgroundLogger.getLogsByComponent(component) : 
        BackgroundLogger.getAllLogs();
      
      BackgroundLogger.log('info', 'LOG_PROVIDER', 'Logs requested', {
        component,
        count: logs.length
      });
      
      sendResponse({ logs });
      break;
      
    case 'startRecording':
      BackgroundLogger.log('info', 'RECORDING', 'Start recording requested from popup');
      
      // Inyectar content script en la pestaña activa
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && isValidUrl(tabs[0].url)) {
          safeScriptInjection(tabs[0].id, (tab) => {
            // Primero verificar si ya existe el content script
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}).then((response) => {
              if (response && response.success) {
                // Content script ya existe, enviar comando directamente
                return chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'startRecording',
                  sessionId: request.sessionId
                });
              } else {
                // Content script no existe, inyectar primero
                return chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  files: ['src/content-enhanced.js']
                }).then(() => {
                  // Esperar un poco para que se inicialice
                  return new Promise(resolve => setTimeout(resolve, 100));
                }).then(() => {
                  return chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'startRecording',
                    sessionId: request.sessionId
                  });
                });
              }
            }).catch(() => {
              // Content script no responde, inyectar
              return chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['src/content-enhanced.js']
              }).then(() => {
                return new Promise(resolve => setTimeout(resolve, 100));
              }).then(() => {
                return chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'startRecording',
                  sessionId: request.sessionId
                });
              });
            }).then(() => {
              BackgroundLogger.log('success', 'RECORDING', 'Recording started successfully');
              sendResponse({ success: true });
            }).catch((error) => {
              BackgroundLogger.log('error', 'RECORDING', 'Failed to start recording', error);
              let errorMessage = 'Failed to start recording';
              
              // Proporcionar mensajes más específicos según el error
              if (error.message && error.message.includes('Cannot access')) {
                errorMessage = 'Cannot record on this page - access denied';
              } else if (error.message && error.message.includes('Content Security Policy')) {
                errorMessage = 'Cannot record on this page - Content Security Policy restrictions';
              } else if (error.message && error.message.includes('Receiving end does not exist')) {
                errorMessage = 'Content script initialization failed';
              }
              
              sendResponse({ success: false, error: errorMessage });
            });
          });
        } else {
          BackgroundLogger.log('error', 'RECORDING', 'Invalid URL for recording', {url: tabs[0]?.url});
          sendResponse({ success: false, error: 'Cannot record on this page' });
        }
      });
      return true;
      
    case 'stopRecording':
      BackgroundLogger.log('info', 'RECORDING', 'Stop recording requested from popup');
      
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && isValidUrl(tabs[0].url)) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'stopRecording'
          }).then(() => {
            BackgroundLogger.log('success', 'RECORDING', 'Recording stopped successfully');
            sendResponse({ success: true });
          }).catch((error) => {
            BackgroundLogger.log('warning', 'RECORDING', 'Content script may not be available, but stopping recording', error);
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: true });
        }
      });
      return true;
      
    case 'generateTest':
      BackgroundLogger.log('info', 'TEST_GEN', 'Generate test requested from popup');
      
      try {
        if (!request.actions || request.actions.length === 0) {
          sendResponse({ success: false, error: 'No actions to generate test from' });
          break;
        }
        
        const testData = {
          sessionId: `session_${Date.now()}`,
          actions: request.actions,
          timestamp: new Date().toISOString(),
          title: 'Generated Test'
        };
        
        BackgroundLogger.log('success', 'TEST_GEN', 'Test generated successfully', {
          actionsCount: request.actions.length
        });
        
        sendResponse({ success: true, testData: testData });
      } catch (error) {
        BackgroundLogger.log('error', 'TEST_GEN', 'Failed to generate test', error);
        sendResponse({ success: false, error: error.message });
      }
      break;
      
    case 'exportPlaywright':
      BackgroundLogger.log('info', 'EXPORT', 'Export Playwright requested from popup');
      
      try {
        if (!request.actions || request.actions.length === 0) {
          sendResponse({ success: false, error: 'No actions to export' });
          break;
        }
        
        const playwrightCode = generatePlaywrightTest(request.actions);
        
        // Crear y descargar archivo
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          if (tabs[0]) {
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              func: (code) => {
                const blob = new Blob([code], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `playwright-test-${Date.now()}.spec.js`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              },
              args: [playwrightCode]
            });
          }
        });
        
        BackgroundLogger.log('success', 'EXPORT', 'Playwright test exported successfully');
        sendResponse({ success: true });
      } catch (error) {
        BackgroundLogger.log('error', 'EXPORT', 'Failed to export Playwright test', error);
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'pageRestrictions':
      BackgroundLogger.log('warning', 'PAGE_RESTRICTIONS', 'Page compatibility issues reported', {
        restrictions: request.restrictions,
        url: request.restrictions?.url || 'unknown',
        reason: request.restrictions?.reason || 'unknown'
      });
      
      // Notificar al popup si está abierto
      chrome.runtime.sendMessage({
        action: 'pageRestrictionsWarning',
        restrictions: request.restrictions
      }).catch(() => {
        // Popup might not be open
      });
      
      sendResponse({ success: true });
      break;

    case 'testGeminiAPI':
      BackgroundLogger.log('info', 'GEMINI_TEST', 'Testing Gemini API connection', {
        endpoint: request.endpoint,
        hasApiKey: !!request.apiKey
      });
      
      fetch(`${request.endpoint}?key=${request.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Test connection - responde solo con "OK"' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0
          }
        })
      }).then(response => {
        BackgroundLogger.log('info', 'GEMINI_TEST', 'Gemini API response received', {
          status: response.status,
          statusText: response.statusText
        });
        
        if (!response.ok) {
          return response.text().then(errorText => {
            BackgroundLogger.log('error', 'GEMINI_TEST', 'Gemini API error', { 
              status: response.status, 
              error: errorText 
            });
            sendResponse({ 
              success: false, 
              error: `HTTP ${response.status}: ${response.statusText}`,
              details: errorText
            });
          });
        }
        
        return response.json().then(data => {
          BackgroundLogger.log('success', 'GEMINI_TEST', 'Gemini API test successful', data);
          
          // Verificar que la respuesta tenga la estructura esperada
          if (data.candidates && data.candidates.length > 0) {
            sendResponse({ 
              success: true, 
              message: 'Conexión exitosa con Gemini Pro',
              response: data
            });
          } else {
            sendResponse({ 
              success: false, 
              error: 'Respuesta inesperada de Gemini',
              response: data
            });
          }
        });
      }).catch(error => {
        BackgroundLogger.log('error', 'GEMINI_TEST', 'Failed to test Gemini API', error);
        
        let errorMessage = error.message;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorMessage = 'Error de red - verifica tu conexión a internet';
        }
        
        sendResponse({ success: false, error: errorMessage });
      });
      
      return true; // Keep message channel open for async response
      
    default:
      BackgroundLogger.log('warning', 'MESSAGE_HANDLER', 'Unknown action received', {
        action: request.action,
        sender: senderInfo
      });
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Navegación entre páginas - mantener estado de grabación
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    BackgroundLogger.log('info', 'NAVIGATION', 'Page navigation completed', {
      tabId: details.tabId,
      url: details.url,
      timestamp: details.timeStamp
    });
    
    if (!isValidUrl(details.url)) {
      BackgroundLogger.log('warning', 'NAVIGATION', 'Skipping script injection for restricted URL', {
        tabId: details.tabId,
        url: details.url
      });
      return;
    }
    
    chrome.storage.local.get(['sessionData'], (result) => {
      if (chrome.runtime.lastError) {
        BackgroundLogger.log('error', 'NAVIGATION', 'Failed to get session data', chrome.runtime.lastError);
        return;
      }
      
      if (result.sessionData && result.sessionData.isRecording) {
        BackgroundLogger.log('info', 'NAVIGATION', 'Recording session active, injecting script', {
          tabId: details.tabId,
          sessionId: result.sessionData.sessionId
        });
        
        setTimeout(() => {
          safeScriptInjection(details.tabId, (tab) => {
            chrome.scripting.executeScript({
              target: { tabId: details.tabId },
              files: ['src/content-enhanced.js']
            }).then(() => {
              BackgroundLogger.log('success', 'NAVIGATION', 'Content script injected on navigation', {
                tabId: details.tabId,
                url: tab.url
              });
            }).catch(err => {
              BackgroundLogger.log('error', 'NAVIGATION', 'Script injection failed on navigation', {
                tabId: details.tabId,
                error: err.message
              });
            });
          });
        }, 500);
      } else {
        BackgroundLogger.log('debug', 'NAVIGATION', 'No active recording session, skipping injection');
      }
    });
  }
});

// Context menu handlers
chrome.contextMenus.onClicked.addListener((info, tab) => {
  BackgroundLogger.log('info', 'CONTEXT_MENU', 'Context menu item clicked', {
    menuItemId: info.menuItemId,
    tabId: tab.id,
    url: tab.url
  });
  
  if (!isValidUrl(tab.url)) {
    BackgroundLogger.log('warning', 'CONTEXT_MENU', 'Cannot execute context menu action on restricted URL', {
      tabId: tab.id,
      url: tab.url
    });
    return;
  }
  
  switch (info.menuItemId) {
    case 'testbuilder-start':
      BackgroundLogger.log('info', 'CONTEXT_MENU', 'Starting TestBuilder via context menu');
      safeScriptInjection(tab.id, (validTab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            if (window.testBuilderPro) {
              window.testBuilderPro.startRecording();
              return { success: true, message: 'Recording started via context menu' };
            } else {
              return { success: false, message: 'TestBuilder not found on page' };
            }
          }
        }).then(results => {
          BackgroundLogger.log('success', 'CONTEXT_MENU', 'Context menu start recording executed', results);
        }).catch(err => {
          BackgroundLogger.log('error', 'CONTEXT_MENU', 'Context menu execution failed', err);
        });
      });
      break;
      
    case 'testbuilder-generate':
      BackgroundLogger.log('info', 'CONTEXT_MENU', 'Generating test via context menu');
      safeScriptInjection(tab.id, (validTab) => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            if (window.testBuilderPro) {
              const testCode = window.testBuilderPro.generatePlaywrightTest();
              return { success: true, message: 'Test generated', testCode };
            } else {
              return { success: false, message: 'TestBuilder not found on page' };
            }
          }
        }).then(results => {
          BackgroundLogger.log('success', 'CONTEXT_MENU', 'Context menu test generation executed', results);
        }).catch(err => {
          BackgroundLogger.log('error', 'CONTEXT_MENU', 'Context menu generation failed', err);
        });
      });
      break;
      
    default:
      BackgroundLogger.log('warning', 'CONTEXT_MENU', 'Unknown context menu item', info.menuItemId);
  }
});

// Error handlers globales para background
self.addEventListener('error', (event) => {
  BackgroundLogger.log('error', 'GLOBAL_ERROR', 'Unhandled error in background script', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    error: event.error
  });
});

self.addEventListener('unhandledrejection', (event) => {
  BackgroundLogger.log('error', 'GLOBAL_ERROR', 'Unhandled promise rejection in background script', {
    reason: event.reason
  });
});

BackgroundLogger.log('success', 'BACKGROUND', 'TestBuilder Background Script Ready with Debug Logging!');

// Variable para controlar que los menús solo se configuren una vez
let menusInitialized = false;

// Función para inicializar menús una sola vez
function initializeMenusOnce() {
  if (menusInitialized) {
    BackgroundLogger.log('info', 'MENU_SETUP', 'Menus already initialized, skipping');
    return;
  }
  
  menusInitialized = true;
  BackgroundLogger.log('info', 'MENU_SETUP', 'Initializing menus for the first time');
  setupContextMenus();
}

// Configurar menús solo en instalación/actualización
chrome.runtime.onStartup.addListener(() => {
  BackgroundLogger.log('info', 'STARTUP', 'Extension startup detected');
  initializeMenusOnce();
});

// Inicializar menús al cargar el script (solo una vez)
initializeMenusOnce();

// Función para generar código de Playwright
function generatePlaywrightTest(actions) {
  if (!actions || actions.length === 0) return '';
  
  const url = actions[0]?.url || 'https://example.com';
  const title = 'Generated Test';
  
  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `test('${title}', async ({ page }) => {\n`;
  code += `  await page.goto('${url}');\n\n`;
  
  actions.forEach((action, index) => {
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
    if (index < actions.length - 1) {
      code += `  await page.waitForTimeout(500);\n`;
    }
  });
  
  code += `\n  // Add assertions here\n`;
  code += `  // await expect(page).toHaveTitle(/expected title/i);\n`;
  code += `});\n`;
  
  return code;
}

// Función para validar URLs permitidas
function isValidUrl(url) {
  if (!url) return false;
  
  const restrictedPatterns = [
    /^chrome:/,
    /^chrome-extension:/,
    /^moz-extension:/,
    /^ms-browser-extension:/,
    /^about:/,
    /^file:/
  ];
  
  return !restrictedPatterns.some(pattern => pattern.test(url));
}

// Función segura para inyectar scripts
function safeScriptInjection(tabId, callback) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn(' Error accessing tab:', chrome.runtime.lastError.message);
      return;
    }
    
    if (!isValidUrl(tab.url)) {
      console.warn(' Cannot inject into restricted URL:', tab.url);
      return;
    }
    
    callback(tab);
  });
}

BackgroundLogger.log('success', 'BACKGROUND', 'TestBuilder Background Script Ready!');
