// TestBuilder Popup Script con Debug Avanzado// TestBuilder Popup Script// TestBuilder Popup Script// TestBuilder Popup Script// popup.ts - Lógica del popup de la extensión

console.log('🧪 [POPUP] TestBuilder Popup Loading... Timestamp:', new Date().toISOString());

console.log('🧪 TestBuilder Popup Loading...');

// Sistema de logging detallado

const DebugLogger = {console.log('TestBuilder Popup Loading...');

  logs: [],

  // Estado global

  log(level, message, data = null) {

    const timestamp = new Date().toISOString();let isRecording = false;console.log('TestBuilder Popup Loading...');

    const logEntry = { timestamp, level, message, data };

    this.logs.push(logEntry);let recordedActions = [];

    

    const emoji = {let currentSession = null;// Estado global

      'info': 'ℹ️',

      'success': '✅', 

      'warning': '⚠️',

      'error': '❌',// Inicializar popup cuando el DOM esté listolet isRecording = false;import type { 

      'debug': '🔍'

    };document.addEventListener('DOMContentLoaded', async () => {

    

    console.log(`${emoji[level]} [POPUP] ${message}`, data || '');  console.log('✅ Popup DOM loaded');let recordedActions = [];

    

    // Enviar logs al background para centralizar  await loadSessionState();

    if (chrome.runtime) {

      chrome.runtime.sendMessage({  setupEventListeners();// Estado global  MessageEvent, 

        action: 'debugLog',

        log: logEntry  updateUI();

      }).catch(err => console.warn('Failed to send log to background:', err));

    }});// Inicializar popup cuando el DOM esté listo

  },

  

  getAllLogs() {

    return this.logs;// Cargar estado de la sesióndocument.addEventListener('DOMContentLoaded', () => {let isRecording = false;  UserSettings, 

  },

  async function loadSessionState() {

  exportLogs() {

    const logText = this.logs.map(log =>   try {  console.log('Popup DOM loaded');

      `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`

    ).join('\n');    const result = await chrome.storage.local.get(['sessionData']);

    

    const blob = new Blob([logText], { type: 'text/plain' });    if (result.sessionData) {  setupEventListeners();let recordedActions = [];  TestSession,

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');      isRecording = result.sessionData.isRecording || false;

    a.href = url;

    a.download = `testbuilder-popup-logs-${Date.now()}.txt`;      recordedActions = result.sessionData.recordedActions || [];  loadSessionState();

    a.click();

    URL.revokeObjectURL(url);      currentSession = result.sessionData.sessionId;

  }

};      console.log('📊 Session loaded:', { isRecording, actionsCount: recordedActions.length });});let currentSession = null;  CapturedEvent



// Estado global con debug    }

let isRecording = false;

let recordedActions = [];  } catch (error) {

let currentSession = null;

    console.error('❌ Error loading session:', error);

DebugLogger.log('info', 'Popup script variables initialized');

  }// Configurar event listeners} from './types.js';

// Verificar APIs de Chrome disponibles

DebugLogger.log('debug', 'Chrome APIs check', {}

  runtime: !!chrome.runtime,

  storage: !!chrome.storage,function setupEventListeners() {

  tabs: !!chrome.tabs,

  scripting: !!chrome.scripting// Configurar event listeners

});

function setupEventListeners() {  const startBtn = document.getElementById('startRecord');// Inicializar popupimport { Utils } from './utils.js';

// Inicializar popup cuando el DOM esté listo

document.addEventListener('DOMContentLoaded', async () => {  console.log('🔧 Setting up event listeners...');

  DebugLogger.log('success', 'DOM Content Loaded event fired');

      const stopBtn = document.getElementById('stopRecord');

  try {

    await loadSessionState();  const startBtn = document.getElementById('startRecord');

    await setupEventListeners();

    updateUI();  const stopBtn = document.getElementById('stopRecord');  const saveBtn = document.getElementById('saveTest');document.addEventListener('DOMContentLoaded', async () => {

    DebugLogger.log('success', 'Popup initialization completed successfully');

  } catch (error) {  const saveBtn = document.getElementById('saveTest');

    DebugLogger.log('error', 'Popup initialization failed', error);

  }  const viewBtn = document.getElementById('viewTests');  const viewBtn = document.getElementById('viewTests');

});

  const exportPlaywrightBtn = document.getElementById('exportPlaywright');

// Cargar estado de la sesión con debug detallado

async function loadSessionState() {  const exportJiraBtn = document.getElementById('exportJira');  const exportPlaywrightBtn = document.getElementById('exportPlaywright');  console.log('Popup DOM loaded');declare const chrome: any;

  DebugLogger.log('info', 'Loading session state...');

  

  try {

    if (!chrome.storage || !chrome.storage.local) {  if (startBtn) {  const exportJiraBtn = document.getElementById('exportJira');

      throw new Error('Chrome storage API not available');

    }    startBtn.addEventListener('click', startRecording);

    

    const result = await chrome.storage.local.get(['sessionData']);    console.log('✅ Start button listener added');  

    DebugLogger.log('debug', 'Storage result received', result);

      } else {

    if (result.sessionData) {

      isRecording = result.sessionData.isRecording || false;    console.warn('⚠️ Start button not found');  if (startBtn) {

      recordedActions = result.sessionData.recordedActions || [];

      currentSession = result.sessionData.sessionId;  }

      

      DebugLogger.log('success', 'Session state loaded from storage', {      startBtn.addEventListener('click', startRecording);  await loadSessionState();class TestBuilderPopup {

        isRecording,

        actionsCount: recordedActions.length,  if (stopBtn) {

        sessionId: currentSession

      });    stopBtn.addEventListener('click', stopRecording);  }

    } else {

      DebugLogger.log('info', 'No existing session data found in storage');    console.log('✅ Stop button listener added');

    }

  } catch (error) {  } else {    setupEventListeners();  private settings: UserSettings | null = null;

    DebugLogger.log('error', 'Failed to load session state', error);

  }    console.warn('⚠️ Stop button not found');

}

  }  if (stopBtn) {

// Configurar event listeners con verificación detallada

async function setupEventListeners() {  

  DebugLogger.log('info', 'Setting up event listeners...');

    if (saveBtn) {    stopBtn.addEventListener('click', stopRecording);  updateUI();  private currentSession: TestSession | null = null;

  const elements = {

    startBtn: 'startRecord',    saveBtn.addEventListener('click', saveTest);

    stopBtn: 'stopRecord', 

    saveBtn: 'saveTest',    console.log('✅ Save button listener added');  }

    viewBtn: 'viewTests',

    exportPlaywrightBtn: 'exportPlaywright',  }

    exportJiraBtn: 'exportJira'

  };    });  private isSessionActive = false;

  

  const results = {};  if (viewBtn) {

  

  for (const [name, id] of Object.entries(elements)) {    viewBtn.addEventListener('click', viewTests);  if (saveBtn) {

    const element = document.getElementById(id);

    results[name] = {  }

      id,

      found: !!element,      saveBtn.addEventListener('click', saveTest);

      element: element || null

    };  if (exportPlaywrightBtn) {

    

    if (element) {    exportPlaywrightBtn.addEventListener('click', exportPlaywright);  }

      switch (name) {

        case 'startBtn':  }

          element.addEventListener('click', startRecording);

          DebugLogger.log('success', `Event listener added for ${name}`);    // Cargar estado de la sesión  constructor() {

          break;

        case 'stopBtn':  if (exportJiraBtn) {

          element.addEventListener('click', stopRecording);

          DebugLogger.log('success', `Event listener added for ${name}`);    exportJiraBtn.addEventListener('click', exportJira);  if (viewBtn) {

          break;

        case 'saveBtn':  }

          element.addEventListener('click', saveTest);

          DebugLogger.log('success', `Event listener added for ${name}`);}    viewBtn.addEventListener('click', viewTests);async function loadSessionState() {    this.init();

          break;

        case 'viewBtn':

          element.addEventListener('click', viewTests);

          DebugLogger.log('success', `Event listener added for ${name}`);// Iniciar grabación  }

          break;

        case 'exportPlaywrightBtn':async function startRecording() {

          element.addEventListener('click', exportPlaywright);

          DebugLogger.log('success', `Event listener added for ${name}`);  console.log('🎬 Starting recording...');    try {  }

          break;

        case 'exportJiraBtn':  

          element.addEventListener('click', exportJira);

          DebugLogger.log('success', `Event listener added for ${name}`);  try {  if (exportPlaywrightBtn) {

          break;

      }    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    } else {

      DebugLogger.log('warning', `Element not found: ${id}`);    console.log('📍 Current tab:', tab.url);    exportPlaywrightBtn.addEventListener('click', exportPlaywright);    const result = await chrome.storage.local.get(['sessionData', 'isRecording']);

    }

  }    

  

  DebugLogger.log('debug', 'Element search results', results);    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {  }

  

  // Agregar botón de debug      alert('❌ No se puede grabar en páginas del sistema de Chrome');

  addDebugControls();

}      return;      if (result.sessionData) {  private async init(): Promise<void> {



// Agregar controles de debug al popup    }

function addDebugControls() {

  const debugContainer = document.createElement('div');      if (exportJiraBtn) {

  debugContainer.style.cssText = `

    position: fixed;    // Inyectar content script

    bottom: 10px;

    left: 10px;    await chrome.scripting.executeScript({    exportJiraBtn.addEventListener('click', exportJira);      isRecording = result.sessionData.isRecording || false;    await this.loadSettings();

    right: 10px;

    background: #f8f9fa;      target: { tabId: tab.id },

    border: 1px solid #dee2e6;

    border-radius: 5px;      files: ['src/content-enhanced.js']  }

    padding: 10px;

    font-size: 11px;    });

    z-index: 10000;

  `;    console.log('✅ Content script injected');}      recordedActions = result.sessionData.recordedActions || [];    this.setupEventListeners();

  

  debugContainer.innerHTML = `    

    <div style="font-weight: bold; margin-bottom: 5px;">🔍 Debug Controls</div>

    <button id="exportLogs" style="margin: 2px; padding: 4px 8px; font-size: 10px;">📄 Export Logs</button>    // Enviar mensaje para iniciar grabación

    <button id="testConnection" style="margin: 2px; padding: 4px 8px; font-size: 10px;">🔗 Test Connection</button>

    <button id="checkPermissions" style="margin: 2px; padding: 4px 8px; font-size: 10px;">🔐 Check Perms</button>    const response = await chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });

    <div id="debugStatus" style="margin-top: 5px; font-size: 10px; color: #666;"></div>

  `;    console.log('📡 Message sent to content script:', response);// Cargar estado de la sesión      currentSession = result.sessionData.sessionId;    this.updateUI();

  

  document.body.appendChild(debugContainer);    

  

  // Event listeners para debug    isRecording = true;function loadSessionState() {

  document.getElementById('exportLogs').addEventListener('click', () => {

    DebugLogger.exportLogs();    updateUI();

  });

      showStatus('🔴 Grabación iniciada', 'success');  chrome.storage.local.get(['sessionData'], (result) => {      console.log('Session loaded:', { isRecording, actionsCount: recordedActions.length });    

  document.getElementById('testConnection').addEventListener('click', testConnection);

  document.getElementById('checkPermissions').addEventListener('click', checkPermissions);    

  

  DebugLogger.log('success', 'Debug controls added to popup');  } catch (error) {    if (result.sessionData) {

}

    console.error('❌ Error starting recording:', error);

// Probar conexión con background y content scripts

async function testConnection() {    showStatus('❌ Error al iniciar grabación: ' + error.message, 'error');      isRecording = result.sessionData.isRecording || false;    }    Utils.log('info', 'Popup inicializado');

  DebugLogger.log('info', 'Testing connections...');

    }

  try {

    // Test background connection}      recordedActions = result.sessionData.recordedActions || [];

    const bgResponse = await chrome.runtime.sendMessage({ action: 'ping' });

    DebugLogger.log('success', 'Background script connection', bgResponse);

    

    // Test content script connection// Detener grabación      updateUI();  } catch (error) {  }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    DebugLogger.log('info', 'Current tab info', {async function stopRecording() {

      id: tab.id,

      url: tab.url,  console.log('⏹️ Stopping recording...');    }

      title: tab.title

    });  

    

    try {  try {  });    console.error('Error loading session:', error);

      const contentResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });

      DebugLogger.log('success', 'Content script connection', contentResponse);    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    } catch (contentError) {

      DebugLogger.log('warning', 'Content script not available, will inject', contentError);    await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });}

      

      // Intentar inyectar    

      try {

        await chrome.scripting.executeScript({    isRecording = false;  }  private async loadSettings(): Promise<void> {

          target: { tabId: tab.id },

          files: ['src/content-enhanced.js']    updateUI();

        });

        DebugLogger.log('success', 'Content script injected successfully');    showStatus('⏹️ Grabación detenida', 'success');// Iniciar grabación

        

        // Probar de nuevo    

        const retryResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });

        DebugLogger.log('success', 'Content script connection after injection', retryResponse);  } catch (error) {function startRecording() {}    try {

      } catch (injectionError) {

        DebugLogger.log('error', 'Failed to inject content script', injectionError);    console.error('❌ Error stopping recording:', error);

      }

    }    showStatus('❌ Error al detener grabación', 'error');  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {

    

  } catch (error) {  }

    DebugLogger.log('error', 'Connection test failed', error);

  }}    if (tabs[0]) {      const result = await chrome.storage.sync.get('testBuilderSettings');

}



// Verificar permisos

async function checkPermissions() {// Guardar test      // Inyectar content script

  DebugLogger.log('info', 'Checking permissions...');

  async function saveTest() {

  try {

    const permissions = await chrome.permissions.getAll();  console.log('💾 Saving test...');      chrome.scripting.executeScript({// Configurar event listeners      this.settings = result.testBuilderSettings || this.getDefaultSettings();

    DebugLogger.log('debug', 'Current permissions', permissions);

      

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const canAccess = await chrome.permissions.contains({  try {        target: { tabId: tabs[0].id },

      origins: [tab.url]

    });    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    

    DebugLogger.log('info', 'Tab access permission', {    await chrome.tabs.sendMessage(tab.id, { action: 'saveTest' });        files: ['src/content-enhanced.js']function setupEventListeners() {      this.populateSettingsForm();

      url: tab.url,

      canAccess    showStatus('💾 Test guardado', 'success');

    });

              }, () => {

  } catch (error) {

    DebugLogger.log('error', 'Permission check failed', error);  } catch (error) {

  }

}    console.error('❌ Error saving test:', error);        // Iniciar grabación  // Botones principales    } catch (error) {



// Iniciar grabación con logs detallados    showStatus('❌ Error al guardar test', 'error');

async function startRecording() {

  DebugLogger.log('info', 'Start recording button clicked');  }        chrome.tabs.sendMessage(tabs[0].id, {action: 'startRecording'}, (response) => {

  

  try {}

    // Verificar APIs necesarias

    if (!chrome.tabs) {          if (chrome.runtime.lastError) {  const startBtn = document.getElementById('start-recording');      Utils.log('error', 'Error cargando configuración', error);

      throw new Error('Chrome tabs API not available');

    }// Ver tests guardados

    

    if (!chrome.scripting) {function viewTests() {            console.error('Error:', chrome.runtime.lastError);

      throw new Error('Chrome scripting API not available');

    }  chrome.tabs.create({ url: 'http://localhost:5250/' });

    

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });}          } else {  const stopBtn = document.getElementById('stop-recording');      this.settings = this.getDefaultSettings();

    DebugLogger.log('info', 'Got current tab', {

      id: tab.id,

      url: tab.url,

      title: tab.title// Exportar a Playwright            isRecording = true;

    });

    async function exportPlaywright() {

    // Verificar URL válida

    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {  try {            updateUI();  const pauseBtn = document.getElementById('pause-recording');    }

      const message = 'Cannot record on Chrome system pages';

      DebugLogger.log('warning', message);    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      alert('❌ ' + message);

      return;    await chrome.tabs.sendMessage(tab.id, { action: 'exportPlaywright' });          }

    }

        showStatus('🎭 Exportado a Playwright', 'success');

    // Inyectar content script

    DebugLogger.log('info', 'Injecting content script...');  } catch (error) {        });  const clearBtn = document.getElementById('clear-recording');  }

    await chrome.scripting.executeScript({

      target: { tabId: tab.id },    console.error('❌ Error exporting to Playwright:', error);

      files: ['src/content-enhanced.js']

    });  }      });

    DebugLogger.log('success', 'Content script injection completed');

    }

    // Esperar un momento para que el script se inicialice

    await new Promise(resolve => setTimeout(resolve, 1000));    }  const saveBtn = document.getElementById('save-test');

    

    // Enviar mensaje para iniciar grabación// Exportar a Jira

    DebugLogger.log('info', 'Sending start recording message to content script...');

    const response = await chrome.tabs.sendMessage(tab.id, { async function exportJira() {  });

      action: 'startRecording',

      timestamp: Date.now()  try {

    });

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });}  const configBtn = document.getElementById('open-config');  private getDefaultSettings(): UserSettings {

    DebugLogger.log('success', 'Content script response received', response);

        await chrome.tabs.sendMessage(tab.id, { action: 'exportJira' });

    isRecording = true;

    updateUI();    showStatus('📊 Exportado a Jira', 'success');

    showStatus('🔴 Grabación iniciada', 'success');

      } catch (error) {

  } catch (error) {

    DebugLogger.log('error', 'Start recording failed', {    console.error('❌ Error exporting to Jira:', error);// Detener grabación    return {

      message: error.message,

      stack: error.stack  }

    });

    showStatus('❌ Error: ' + error.message, 'error');}function stopRecording() {

  }

}



// Detener grabación con logs// Actualizar UI  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {  if (startBtn) {      aiModel: {

async function stopRecording() {

  DebugLogger.log('info', 'Stop recording button clicked');function updateUI() {

  

  try {  const startBtn = document.getElementById('startRecord');    if (tabs[0]) {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });  const stopBtn = document.getElementById('stopRecord');

    

    DebugLogger.log('success', 'Stop recording response', response);  const saveBtn = document.getElementById('saveTest');      chrome.tabs.sendMessage(tabs[0].id, {action: 'stopRecording'}, (response) => {    startBtn.addEventListener('click', startRecording);        provider: 'gemini',

    

    isRecording = false;  const exportBtns = [

    updateUI();

    showStatus('⏹️ Grabación detenida', 'success');    document.getElementById('exportPlaywright'),        if (chrome.runtime.lastError) {

    

  } catch (error) {    document.getElementById('exportJira')

    DebugLogger.log('error', 'Stop recording failed', error);

    showStatus('❌ Error al detener grabación', 'error');  ];          console.error('Error:', chrome.runtime.lastError);  }        model: 'gemini-1.5-flash',

  }

}



// Otras funciones con logs básicos  if (startBtn) {        } else {

async function saveTest() {

  DebugLogger.log('info', 'Save test clicked');    startBtn.disabled = isRecording;

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });    startBtn.textContent = isRecording ? '🔴 Grabando...' : '🎬 Iniciar Grabación';          isRecording = false;          temperature: 0.3

    await chrome.tabs.sendMessage(tab.id, { action: 'saveTest' });

    showStatus('💾 Test guardado', 'success');    startBtn.style.backgroundColor = isRecording ? '#dc3545' : '#667eea';

  } catch (error) {

    DebugLogger.log('error', 'Save test failed', error);  }          updateUI();

  }

}  



function viewTests() {  if (stopBtn) {        }  if (stopBtn) {      },

  DebugLogger.log('info', 'View tests clicked');

  chrome.tabs.create({ url: 'http://localhost:5250/' });    stopBtn.disabled = !isRecording;

}

  }      });

async function exportPlaywright() {

  DebugLogger.log('info', 'Export Playwright clicked');  

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });  if (saveBtn) {    }    stopBtn.addEventListener('click', stopRecording);      userStyle: `Genera pasos de test en español con formato:

    await chrome.tabs.sendMessage(tab.id, { action: 'exportPlaywright' });

    showStatus('🎭 Exportado a Playwright', 'success');    saveBtn.disabled = recordedActions.length === 0 && !isRecording;

  } catch (error) {

    DebugLogger.log('error', 'Export Playwright failed', error);  }  });

  }

}  



async function exportJira() {  exportBtns.forEach(btn => {}  }• Acción específica en el elemento X

  DebugLogger.log('info', 'Export Jira clicked');

  try {    if (btn) {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.tabs.sendMessage(tab.id, { action: 'exportJira' });      btn.disabled = recordedActions.length === 0 && !isRecording;

    showStatus('📊 Exportado a Jira', 'success');

  } catch (error) {    }

    DebugLogger.log('error', 'Export Jira failed', error);

  }  });// Guardar test  • RE: Resultado esperado concreto

}

  

// Actualizar UI con logs

function updateUI() {  console.log('🔄 UI updated:', { isRecording, actionsCount: recordedActions.length });function saveTest() {

  DebugLogger.log('debug', 'Updating UI', { isRecording, actionsCount: recordedActions.length });

  }

  const elements = {

    startBtn: document.getElementById('startRecord'),  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {  if (pauseBtn) {

    stopBtn: document.getElementById('stopRecord'),

    saveBtn: document.getElementById('saveTest'),// Mostrar estado

    exportPlaywright: document.getElementById('exportPlaywright'),

    exportJira: document.getElementById('exportJira')function showStatus(message, type = 'info') {    if (tabs[0]) {

  };

    console.log(`📢 ${message}`);

  if (elements.startBtn) {

    elements.startBtn.disabled = isRecording;        chrome.tabs.sendMessage(tabs[0].id, {action: 'saveTest'});    pauseBtn.addEventListener('click', pauseRecording);Usar terminología de negocio, no técnica.

    elements.startBtn.textContent = isRecording ? '🔴 Grabando...' : '🎬 Iniciar Grabación';

    elements.startBtn.style.backgroundColor = isRecording ? '#dc3545' : '#667eea';  // Crear notificación temporal

  }

    const notification = document.createElement('div');    }

  if (elements.stopBtn) {

    elements.stopBtn.disabled = !isRecording;  notification.style.cssText = `

  }

      position: fixed;  });  }Agrupar acciones relacionadas en un paso.`,

  if (elements.saveBtn) {

    elements.saveBtn.disabled = recordedActions.length === 0 && !isRecording;    top: 10px;

  }

      right: 10px;}

  [elements.exportPlaywright, elements.exportJira].forEach(btn => {

    if (btn) {    padding: 10px 15px;

      btn.disabled = recordedActions.length === 0 && !isRecording;

    }    border-radius: 5px;        defaultPriority: 'Medium',

  });

      color: white;

  // Actualizar debug status

  const debugStatus = document.getElementById('debugStatus');    font-size: 12px;// Ver tests guardados

  if (debugStatus) {

    debugStatus.textContent = `Recording: ${isRecording} | Actions: ${recordedActions.length} | Session: ${currentSession || 'none'}`;    z-index: 10000;

  }

}    transition: opacity 0.3s;function viewTests() {  if (clearBtn) {      userId: Utils.generateId(),



// Mostrar estado con logs  `;

function showStatus(message, type = 'info') {

  DebugLogger.log(type, `Status: ${message}`);    chrome.tabs.create({url: 'http://127.0.0.1:5250/'});

  

  const notification = document.createElement('div');  switch (type) {

  notification.style.cssText = `

    position: fixed;    case 'success':}    clearBtn.addEventListener('click', clearRecording);      privacyMode: true,

    top: 10px;

    right: 10px;      notification.style.backgroundColor = '#28a745';

    padding: 10px 15px;

    border-radius: 5px;      break;

    color: white;

    font-size: 12px;    case 'error':

    z-index: 10000;

    transition: opacity 0.3s;      notification.style.backgroundColor = '#dc3545';// Exportar a Playwright  }      autoScreenshots: true

    max-width: 250px;

  `;      break;

  

  const colors = {    default:function exportPlaywright() {

    success: '#28a745',

    error: '#dc3545',      notification.style.backgroundColor = '#17a2b8';

    warning: '#ffc107',

    info: '#17a2b8'  }  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {      };

  };

    

  notification.style.backgroundColor = colors[type] || colors.info;

  notification.textContent = message;  notification.textContent = message;    if (tabs[0]) {

  document.body.appendChild(notification);

    document.body.appendChild(notification);

  setTimeout(() => {

    notification.style.opacity = '0';        chrome.tabs.sendMessage(tabs[0].id, {action: 'exportPlaywright'});  if (saveBtn) {  }

    setTimeout(() => notification.remove(), 300);

  }, 3000);  setTimeout(() => {

}

    notification.style.opacity = '0';    }

// Escuchar mensajes del background con logs

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {    setTimeout(() => notification.remove(), 300);

  DebugLogger.log('info', 'Message received from background', message);

    }, 3000);  });    saveBtn.addEventListener('click', saveTest);

  switch (message.action) {

    case 'sessionUpdate':}

      isRecording = message.data.isRecording;

      recordedActions = message.data.recordedActions || [];}

      updateUI();

      DebugLogger.log('success', 'Session updated from background');// Escuchar mensajes del background

      break;

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {  }  private setupEventListeners(): void {

    case 'actionRecorded':

      recordedActions.push(message.data);  console.log('📨 Popup received message:', message);

      updateUI();

      DebugLogger.log('success', 'Action recorded', message.data);  // Exportar a Jira

      break;

        switch (message.action) {

    default:

      DebugLogger.log('warning', 'Unknown message action', message.action);    case 'sessionUpdate':function exportJira() {      // Tabs

  }

        isRecording = message.data.isRecording;

  sendResponse({ received: true });

});      recordedActions = message.data.recordedActions || [];  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {



// Error handlers globales      updateUI();

window.addEventListener('error', (event) => {

  DebugLogger.log('error', 'Global error in popup', {      break;    if (tabs[0]) {  if (configBtn) {    document.querySelectorAll('.tab').forEach(tab => {

    message: event.message,

    filename: event.filename,      

    lineno: event.lineno,

    error: event.error    case 'actionRecorded':      chrome.tabs.sendMessage(tabs[0].id, {action: 'exportJira'});

  });

});      recordedActions.push(message.data);



window.addEventListener('unhandledrejection', (event) => {      updateUI();    }    configBtn.addEventListener('click', openConfiguration);      tab.addEventListener('click', (e) => {

  DebugLogger.log('error', 'Unhandled promise rejection in popup', {

    reason: event.reason      break;

  });

});  }  });



DebugLogger.log('success', 'TestBuilder Popup Ready with Debug Logging!');});

}  }        const target = e.target as HTMLElement;

console.log('🚀 TestBuilder Popup Ready!');


// Actualizar UI        this.switchTab(target.dataset.tab!);

function updateUI() {

  const startBtn = document.getElementById('startRecord');  // Tabs si existen      });

  const stopBtn = document.getElementById('stopRecord');

  const saveBtn = document.getElementById('saveTest');  document.querySelectorAll('.tab').forEach(tab => {    });

  const exportBtns = [

    document.getElementById('exportPlaywright'),    tab.addEventListener('click', (e) => {

    document.getElementById('exportJira')

  ];      switchTab(e.target.dataset.tab);    // Sesión



  if (startBtn) {    });    document.getElementById('start-creation')?.addEventListener('click', () => {

    startBtn.disabled = isRecording;

    startBtn.textContent = isRecording ? '🔴 Grabando...' : '🎬 Iniciar Grabación';  });      this.startSession('creation');

  }

  }    });

  if (stopBtn) {

    stopBtn.disabled = !isRecording;

  }

  // Función para cambiar tabs    document.getElementById('stop-session')?.addEventListener('click', () => {

  if (saveBtn) {

    saveBtn.disabled = recordedActions.length === 0;function switchTab(tabName) {      this.stopSession();

  }

    // Remover active de todos los tabs    });

  exportBtns.forEach(btn => {

    if (btn) {  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

      btn.disabled = recordedActions.length === 0;

    }  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));    document.getElementById('start-reproduction')?.addEventListener('click', () => {

  });

}        this.startSession('reproduction');



// Escuchar mensajes del background  // Activar tab seleccionado    });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === 'sessionUpdate') {  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    isRecording = message.data.isRecording;

    recordedActions = message.data.recordedActions || [];  document.getElementById(tabName).classList.add('active');    document.getElementById('clear-events')?.addEventListener('click', () => {

    updateUI();

  }}      this.clearEvents();

});

    });

console.log('TestBuilder Popup Ready!');
// Iniciar grabación

async function startRecording() {    // Exportación

  try {    document.getElementById('export-drive')?.addEventListener('click', () => {

    // Obtener tab activo      this.exportToDrive();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });    });

    

    // Inyectar content script si es necesario    document.getElementById('export-download')?.addEventListener('click', () => {

    await chrome.scripting.executeScript({      this.exportToDownload();

      target: { tabId: tab.id },    });

      files: ['src/content-enhanced.js']

    });    document.getElementById('execute-cloud')?.addEventListener('click', () => {

          this.executeInCloud();

    // Enviar mensaje para iniciar grabación    });

    await chrome.tabs.sendMessage(tab.id, { action: 'startRecording' });

        // Configuración

    isRecording = true;    document.getElementById('ai-provider')?.addEventListener('change', (e) => {

    updateUI();      const target = e.target as HTMLSelectElement;

    showNotification('Grabación iniciada', 'success');      this.updateAIProviderUI(target.value);

        });

  } catch (error) {

    console.error('Error starting recording:', error);    document.getElementById('save-settings')?.addEventListener('click', () => {

    showNotification('Error al iniciar grabación', 'error');      this.saveSettings();

  }    });

}

    document.getElementById('reset-settings')?.addEventListener('click', () => {

// Detener grabación      this.resetSettings();

async function stopRecording() {    });

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });    document.getElementById('connect-drive')?.addEventListener('click', () => {

    await chrome.tabs.sendMessage(tab.id, { action: 'stopRecording' });      this.connectGoogleDrive();

        });

    isRecording = false;  }

    updateUI();

    showNotification('Grabación detenida', 'success');  private switchTab(tabName: string): void {

        // Desactivar todas las tabs

  } catch (error) {    document.querySelectorAll('.tab').forEach(tab => {

    console.error('Error stopping recording:', error);      tab.classList.remove('active');

    showNotification('Error al detener grabación', 'error');    });

  }    document.querySelectorAll('.tab-panel').forEach(panel => {

}      panel.classList.remove('active');

    });

// Pausar/Reanudar grabación

async function pauseRecording() {    // Activar tab seleccionada

  try {    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });    document.querySelector(`[data-panel="${tabName}"]`)?.classList.add('active');

    await chrome.tabs.sendMessage(tab.id, { action: 'pauseRecording' });  }

    

    showNotification('Grabación pausada/reanudada', 'info');  private async startSession(mode: 'creation' | 'reproduction'): Promise<void> {

        try {

  } catch (error) {      const sessionName = (document.getElementById('session-name') as HTMLInputElement).value || 

    console.error('Error pausing recording:', error);                         `Sesión ${new Date().toLocaleString()}`;

  }

}      const message: MessageEvent = {

        type: 'START_SESSION',

// Limpiar grabación        payload: { mode, name: sessionName }

async function clearRecording() {      };

  try {

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });      const response = await this.sendMessageToBackground(message);

    await chrome.tabs.sendMessage(tab.id, { action: 'clearRecording' });      

          if (response.success) {

    recordedActions = [];        this.currentSession = response.data;

    updateUI();        this.isSessionActive = true;

    showNotification('Grabación limpiada', 'info');        this.updateSessionUI();

            

  } catch (error) {        this.showAlert('success', `Sesión de ${mode} iniciada correctamente`);

    console.error('Error clearing recording:', error);      } else {

  }        throw new Error(response.error || 'Error desconocido');

}      }

    } catch (error) {

// Guardar test      Utils.log('error', 'Error iniciando sesión', error);

async function saveTest() {      this.showAlert('error', `Error iniciando sesión: ${error instanceof Error ? error.message : error}`);

  try {    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });  }

    await chrome.tabs.sendMessage(tab.id, { action: 'saveTest' });

      private async stopSession(): Promise<void> {

    showNotification('Test guardado', 'success');    if (!this.currentSession) return;

    

  } catch (error) {    try {

    console.error('Error saving test:', error);      const message: MessageEvent = {

    showNotification('Error al guardar test', 'error');        type: 'END_SESSION',

  }        payload: { sessionId: this.currentSession.id }

}      };



// Abrir configuración      await this.sendMessageToBackground(message);

function openConfiguration() {      

  chrome.runtime.openOptionsPage();      this.isSessionActive = false;

}      this.updateSessionUI();

      

// Actualizar UI      this.showAlert('success', 'Sesión terminada correctamente');

function updateUI() {    } catch (error) {

  const statusElement = document.getElementById('recording-status');      Utils.log('error', 'Error terminando sesión', error);

  const countElement = document.getElementById('actions-count');      this.showAlert('error', `Error terminando sesión: ${error instanceof Error ? error.message : error}`);

  const startBtn = document.getElementById('start-recording');    }

  const stopBtn = document.getElementById('stop-recording');  }

  const saveBtn = document.getElementById('save-test');

    private clearEvents(): void {

  if (statusElement) {    if (this.currentSession) {

    statusElement.textContent = isRecording ? 'Grabando...' : 'Detenido';      this.currentSession.events = [];

    statusElement.className = isRecording ? 'status recording' : 'status stopped';    }

  }    this.updateEventsDisplay([]);

      this.showAlert('info', 'Eventos limpiados');

  if (countElement) {  }

    countElement.textContent = recordedActions.length.toString();

  }  private async exportToDrive(): Promise<void> {

      if (!this.currentSession || this.currentSession.events.length === 0) {

  if (startBtn) {      this.showAlert('warning', 'No hay eventos para exportar');

    startBtn.disabled = isRecording;      return;

  }    }

  

  if (stopBtn) {    try {

    stopBtn.disabled = !isRecording;      const format = (document.getElementById('export-format') as HTMLSelectElement).value;

  }      

        const message: MessageEvent = {

  if (saveBtn) {        type: 'EXPORT_DATA',

    saveBtn.disabled = recordedActions.length === 0;        payload: {

  }          sessionId: this.currentSession.id,

}          format

        }

// Mostrar notificación      };

function showNotification(message, type = 'info') {

  const notification = document.getElementById('notification');      const response = await this.sendMessageToBackground(message);

  if (notification) {      

    notification.textContent = message;      if (response.success) {

    notification.className = `notification ${type} show`;        // Guardar en Drive

            const filename = `testbuilder-${format}-${Utils.formatDateForFilename()}.${format === 'csv' ? 'csv' : format.includes('json') ? 'json' : 'ts'}`;

    setTimeout(() => {        

      notification.classList.remove('show');        const driveMessage: MessageEvent = {

    }, 3000);          type: 'SAVE_TO_DRIVE',

  }          payload: {

}            content: response.data.content || JSON.stringify(response.data, null, 2),

            filename,

// Escuchar mensajes del background            mimeType: format === 'csv' ? 'text/csv' : 'text/plain'

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {          }

  console.log('Popup received message:', message);        };

  

  switch (message.action) {        const driveResponse = await this.sendMessageToBackground(driveMessage);

    case 'sessionUpdate':        

      isRecording = message.data.isRecording;        if (driveResponse.success) {

      recordedActions = message.data.recordedActions || [];          this.showAlert('success', `Exportado a Google Drive: ${filename}`);

      updateUI();        } else {

      break;          throw new Error(driveResponse.error || 'Error guardando en Drive');

              }

    case 'actionRecorded':      } else {

      recordedActions.push(message.data);        throw new Error(response.error || 'Error en exportación');

      updateUI();      }

      break;    } catch (error) {

  }      Utils.log('error', 'Error exportando a Drive', error);

});      this.showAlert('error', `Error exportando: ${error instanceof Error ? error.message : error}`);

    }

console.log('TestBuilder Popup Ready!');  }

  private async exportToDownload(): Promise<void> {
    if (!this.currentSession || this.currentSession.events.length === 0) {
      this.showAlert('warning', 'No hay eventos para exportar');
      return;
    }

    try {
      const format = (document.getElementById('export-format') as HTMLSelectElement).value;
      
      const message: MessageEvent = {
        type: 'EXPORT_DATA',
        payload: {
          sessionId: this.currentSession.id,
          format
        }
      };

      const response = await this.sendMessageToBackground(message);
      
      if (response.success) {
        const filename = `testbuilder-${format}-${Utils.formatDateForFilename()}.${format === 'csv' ? 'csv' : format.includes('json') ? 'json' : 'ts'}`;
        const content = response.data.content || JSON.stringify(response.data, null, 2);
        const mimeType = format === 'csv' ? 'text/csv' : 'text/plain';

        Utils.downloadFile(content, filename, mimeType);
        this.showAlert('success', `Descargado: ${filename}`);
      } else {
        throw new Error(response.error || 'Error en exportación');
      }
    } catch (error) {
      Utils.log('error', 'Error descargando archivo', error);
      this.showAlert('error', `Error descargando: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async executeInCloud(): Promise<void> {
    if (!this.currentSession || this.currentSession.events.length === 0) {
      this.showAlert('warning', 'No hay eventos para ejecutar');
      return;
    }

    try {
      // Primero exportar como Playwright
      const exportMessage: MessageEvent = {
        type: 'EXPORT_DATA',
        payload: {
          sessionId: this.currentSession.id,
          format: 'playwright-json'
        }
      };

      const exportResponse = await this.sendMessageToBackground(exportMessage);
      
      if (!exportResponse.success) {
        throw new Error(exportResponse.error || 'Error exportando para ejecución');
      }

      // Mostrar log de ejecución
      const logDiv = document.getElementById('execution-log');
      const logContent = document.getElementById('log-content') as HTMLTextAreaElement;
      
      if (logDiv && logContent) {
        logDiv.classList.remove('hidden');
        logContent.value = 'Iniciando ejecución en la nube...\n';
      }

      // Ejecutar en la nube
      const executeMessage: MessageEvent = {
        type: 'EXECUTE_SUITE',
        payload: {
          suite: exportResponse.data,
          timeout: 120000
        }
      };

      const executeResponse = await this.sendMessageToBackground(executeMessage);
      
      if (executeResponse.success) {
        const result = executeResponse.data;
        
        if (logContent) {
          logContent.value += `\nEjecución completada:\n`;
          logContent.value += `- Total: ${result.stats?.total || 0} tests\n`;
          logContent.value += `- Exitosos: ${result.stats?.passed || 0}\n`;
          logContent.value += `- Fallidos: ${result.stats?.failed || 0}\n`;
          logContent.value += `- Duración: ${result.duration || 0}ms\n\n`;
          
          if (result.logs && result.logs.length > 0) {
            logContent.value += 'Logs:\n' + result.logs.join('\n') + '\n\n';
          }
          
          if (result.errors && result.errors.length > 0) {
            logContent.value += 'Errores:\n' + result.errors.join('\n');
          }
        }

        this.showAlert('success', 'Ejecución completada. Ver log para detalles.');
      } else {
        throw new Error(executeResponse.error || 'Error en ejecución');
      }
    } catch (error) {
      Utils.log('error', 'Error ejecutando en la nube', error);
      this.showAlert('error', `Error ejecutando: ${error instanceof Error ? error.message : error}`);
      
      const logContent = document.getElementById('log-content') as HTMLTextAreaElement;
      if (logContent) {
        logContent.value += `\nError: ${error instanceof Error ? error.message : error}`;
      }
    }
  }

  private updateAIProviderUI(provider: string): void {
    const apiConfig = document.getElementById('api-config');
    const apiBaseConfig = document.getElementById('api-base-config');

    if (apiConfig && apiBaseConfig) {
      if (provider === 'gemini') {
        apiConfig.style.display = 'none';
        apiBaseConfig.style.display = 'none';
      } else if (provider === 'anthropic') {
        apiConfig.style.display = 'block';
        apiBaseConfig.style.display = 'none';
      } else if (provider === 'openai-compat') {
        apiConfig.style.display = 'block';
        apiBaseConfig.style.display = 'block';
      }
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const newSettings = this.getSettingsFromForm();
      
      await chrome.storage.sync.set({
        testBuilderSettings: newSettings
      });

      this.settings = newSettings;

      // Notificar al background script
      const message: MessageEvent = {
        type: 'UPDATE_SETTINGS',
        payload: newSettings
      };

      await this.sendMessageToBackground(message);

      this.showAlert('success', 'Configuración guardada correctamente');
    } catch (error) {
      Utils.log('error', 'Error guardando configuración', error);
      this.showAlert('error', 'Error guardando configuración');
    }
  }

  private resetSettings(): void {
    this.settings = this.getDefaultSettings();
    this.populateSettingsForm();
    this.showAlert('info', 'Configuración restaurada a valores por defecto');
  }

  private async connectGoogleDrive(): Promise<void> {
    try {
      // Implementar OAuth con Google Drive
      const token = await chrome.identity.getAuthToken({ interactive: true });
      
      if (token) {
        this.showAlert('success', 'Conectado a Google Drive correctamente');
        
        const button = document.getElementById('connect-drive');
        if (button) {
          button.textContent = '✅ Drive Conectado';
          button.classList.remove('btn-success');
          button.classList.add('btn-success');
        }
      }
    } catch (error) {
      Utils.log('error', 'Error conectando a Google Drive', error);
      this.showAlert('error', 'Error conectando a Google Drive');
    }
  }

  private populateSettingsForm(): void {
    if (!this.settings) return;

    // AI Provider
    const aiProvider = document.getElementById('ai-provider') as HTMLSelectElement;
    if (aiProvider) {
      aiProvider.value = this.settings.aiModel.provider;
      this.updateAIProviderUI(this.settings.aiModel.provider);
    }

    // API Key
    const apiKey = document.getElementById('api-key') as HTMLInputElement;
    if (apiKey && this.settings.aiModel.apiKey) {
      apiKey.value = this.settings.aiModel.apiKey;
    }

    // API Base
    const apiBase = document.getElementById('api-base') as HTMLInputElement;
    if (apiBase && this.settings.aiModel.apiBase) {
      apiBase.value = this.settings.aiModel.apiBase;
    }

    // User Style
    const userStyle = document.getElementById('user-style') as HTMLTextAreaElement;
    if (userStyle) {
      userStyle.value = this.settings.userStyle;
    }

    // Default Priority
    const defaultPriority = document.getElementById('default-priority') as HTMLSelectElement;
    if (defaultPriority) {
      defaultPriority.value = this.settings.defaultPriority;
    }

    // Checkboxes
    const autoScreenshots = document.getElementById('auto-screenshots') as HTMLInputElement;
    if (autoScreenshots) {
      autoScreenshots.checked = this.settings.autoScreenshots;
    }

    const privacyMode = document.getElementById('privacy-mode') as HTMLInputElement;
    if (privacyMode) {
      privacyMode.checked = this.settings.privacyMode;
    }
  }

  private getSettingsFromForm(): UserSettings {
    const aiProvider = (document.getElementById('ai-provider') as HTMLSelectElement).value as 'gemini' | 'anthropic' | 'openai-compat';
    const apiKey = (document.getElementById('api-key') as HTMLInputElement).value;
    const apiBase = (document.getElementById('api-base') as HTMLInputElement).value;
    const userStyle = (document.getElementById('user-style') as HTMLTextAreaElement).value;
    const defaultPriority = (document.getElementById('default-priority') as HTMLSelectElement).value as 'Low' | 'Medium' | 'High';
    const autoScreenshots = (document.getElementById('auto-screenshots') as HTMLInputElement).checked;
    const privacyMode = (document.getElementById('privacy-mode') as HTMLInputElement).checked;

    return {
      aiModel: {
        provider: aiProvider,
        model: aiProvider === 'gemini' ? 'gemini-1.5-flash' : 
               aiProvider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4',
        apiKey: apiKey || undefined,
        apiBase: apiBase || undefined,
        temperature: 0.3
      },
      userStyle,
      defaultPriority,
      userId: this.settings?.userId || Utils.generateId(),
      privacyMode,
      autoScreenshots,
      driveAccount: this.settings?.driveAccount
    };
  }

  private updateUI(): void {
    this.updateSessionUI();
    this.populateSettingsForm();
  }

  private updateSessionUI(): void {
    const statusIndicator = document.getElementById('session-status');
    const sessionInfo = document.getElementById('session-info');
    const startButton = document.getElementById('start-creation') as HTMLButtonElement;
    const stopButton = document.getElementById('stop-session') as HTMLButtonElement;
    const reproductionButton = document.getElementById('start-reproduction') as HTMLButtonElement;

    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${this.isSessionActive ? 'active' : 'inactive'}`;
    }

    if (sessionInfo) {
      if (this.isSessionActive && this.currentSession) {
        sessionInfo.innerHTML = `
          <p><strong>${this.currentSession.name}</strong></p>
          <p>Modo: ${this.currentSession.mode}</p>
          <p>Eventos: ${this.currentSession.events.length}</p>
          <p>Iniciada: ${new Date(this.currentSession.startTime).toLocaleTimeString()}</p>
        `;
      } else {
        sessionInfo.innerHTML = '<p>No hay sesión activa</p>';
      }
    }

    if (startButton) startButton.disabled = this.isSessionActive;
    if (stopButton) stopButton.disabled = !this.isSessionActive;
    if (reproductionButton) {
      reproductionButton.disabled = this.isSessionActive || 
        !this.currentSession || 
        this.currentSession.events.length === 0;
    }

    // Actualizar lista de eventos
    if (this.currentSession) {
      this.updateEventsDisplay(this.currentSession.events);
    }
  }

  private updateEventsDisplay(events: CapturedEvent[]): void {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;

    if (events.length === 0) {
      eventsList.innerHTML = `
        <div class="event-item">
          <span class="event-description">No hay eventos capturados</span>
        </div>
      `;
      return;
    }

    const eventsHtml = events.slice(-10).map(event => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const description = this.getEventDescription(event);
      
      return `
        <div class="event-item">
          <span class="event-time">${time}</span>
          <div class="event-type">${event.type}</div>
          <div class="event-description">${description}</div>
        </div>
      `;
    }).join('');

    eventsList.innerHTML = eventsHtml;
  }

  private getEventDescription(event: CapturedEvent): string {
    switch (event.type) {
      case 'click':
        return `Click en ${event.elementInfo.tagName}${event.text ? `: "${event.text.substring(0, 30)}"` : ''}`;
      case 'input':
        return `Input en ${event.elementInfo.tagName}${event.elementInfo.placeholder ? ` (${event.elementInfo.placeholder})` : ''}`;
      case 'submit':
        return `Submit formulario`;
      case 'navigate':
        return `Navegación a ${event.url}`;
      default:
        return `${event.type}`;
    }
  }

  private async sendMessageToBackground(message: MessageEvent): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  private showAlert(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    // Remover alertas existentes
    document.querySelectorAll('.alert').forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    // Insertar al principio del contenido de la tab activa
    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel) {
      activePanel.insertBefore(alert, activePanel.firstChild);
    }

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      alert.remove();
    }, 5000);
  }
}

// Inicializar popup cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new TestBuilderPopup();
});