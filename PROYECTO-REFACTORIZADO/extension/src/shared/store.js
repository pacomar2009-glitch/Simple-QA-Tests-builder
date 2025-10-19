// ===================================
// 🏪 STORE - Single Source of Truth
// ===================================
// Redux-like state management para TestBuilder
// Centraliza TODA la lógica de estado de la aplicación
// Con persistence automática a chrome.storage.local

console.log('🏪 [Store] Inicializando Store centralizado...');

/**
 * Store Centralizado - Single Source of Truth
 * Implementa patrón Redux-like con persistence automática
 */
export class Store {
  constructor() {
    // Estado global de la aplicación
    this.state = {
      // ===================================
      // RECORDING STATE
      // ===================================
      recording: {
        isActive: false,              // ¿Grabación en progreso?
        sessionId: null,              // ID único de sesión actual
        startTime: null,              // Timestamp inicio grabación
        activeWindow: null,           // { windowId, tabId, url } de ventana test
        mode: 'idle'                  // 'idle' | 'test-launcher' | 'manual'
      },
      
      // ===================================
      // ACTIONS STATE
      // ===================================
      actions: {
        items: [],                    // Array de Action objects capturadas
        selectedIds: new Set(),       // IDs de acciones seleccionadas
        filters: {
          type: [],                   // Filtros por tipo ['click', 'input', etc]
          enabled: false              // ¿Filtros activos?
        },
        editingId: null               // ID de acción siendo editada
      },
      
      // ===================================
      // TESTS STATE
      // ===================================
      tests: {
        saved: [],                    // Array de SavedTest objects
        current: null,                // Test actual (si existe)
        selectedIds: new Set()        // IDs de tests seleccionados
      },
      
      // ===================================
      // UI STATE
      // ===================================
      ui: {
        popup: {
          state: 'IDLE',              // 'IDLE' | 'TEST_LAUNCHER_ACTIVE' | 'MANUAL_RECORDING' | 'CAPTURE_COMPLETE'
          visible: false              // ¿Popup abierto?
        },
        dashboard: {
          activeTab: 'current-test',  // 'current-test' | 'tests' | 'status' | 'help'
          visible: false              // ¿Dashboard abierto?
        },
        badge: {
          count: 0,                   // Número de pasos capturados
          state: 'idle'               // 'idle' | 'recording' | 'complete' | 'error'
        }
      },
      
      // ===================================
      // INTEGRATIONS STATE
      // ===================================
      integrations: {
        mcp: {
          status: 'disconnected',     // 'connected' | 'disconnected'
          lastPing: null,
          serverUrl: 'http://localhost:3001'
        },
        gemini: {
          status: 'inactive',         // 'active' | 'inactive'
          apiKey: null,
          hasValidKey: false
        },
        n8n: {
          status: 'disconnected',     // 'connected' | 'disconnected'
          webhookUrl: null
        }
      }
    };
    
    // Listeners suscritos a cambios
    this.listeners = new Map();
    
    // Flag de inicialización
    this.initialized = false;
    
    console.log('🏪 [Store] Store creado con estado inicial');
  }
  
  // ===================================
  // INICIALIZACIÓN
  // ===================================
  
  /**
   * Inicializa el Store cargando estado desde storage
   * Debe llamarse una vez al inicio
   */
  async initialize() {
    if (this.initialized) {
      console.warn('⚠️ [Store] Ya está inicializado');
      return;
    }
    
    console.log('🏪 [Store] Inicializando desde storage...');
    
    try {
      await this.hydrate();
      this.initialized = true;
      console.log('✅ [Store] Inicializado correctamente');
    } catch (error) {
      console.error('❌ [Store] Error en inicialización:', error);
      // Continuar con estado default
      this.initialized = true;
    }
  }
  
  // ===================================
  // DISPATCH ACTIONS
  // ===================================
  
  /**
   * Dispatch de acciones - Único punto de modificación de estado
   * @param {Object} action - { type: string, payload: any }
   */
  async dispatch(action) {
    if (!this.initialized) {
      console.warn('⚠️ [Store] Dispatch antes de inicializar. Llamando initialize()...');
      await this.initialize();
    }
    
    const { type, payload } = action;
    console.log(`🔄 [Store] Dispatching: ${type}`, payload);
    
    // Reducers por tipo de acción
    const newState = this.reduce(this.state, action);
    
    // Actualizar estado
    const oldState = this.state;
    this.state = newState;
    
    // Persistir cambios
    await this.persist();
    
    // Notificar listeners
    this.notify(type, oldState, newState);
    
    console.log(`✅ [Store] Dispatch completado: ${type}`);
  }
  
  /**
   * Reducer - Aplica acción al estado actual
   * @private
   */
  reduce(state, action) {
    const { type, payload } = action;
    
    // Crear copia profunda del estado
    const newState = JSON.parse(JSON.stringify(state));
    
    switch (type) {
      // ===================================
      // RECORDING ACTIONS
      // ===================================
      case 'RECORDING_START':
        newState.recording.isActive = true;
        newState.recording.sessionId = payload.sessionId;
        newState.recording.startTime = Date.now();
        newState.recording.mode = payload.mode || 'manual';
        if (payload.windowInfo) {
          newState.recording.activeWindow = payload.windowInfo;
        }
        newState.ui.badge.state = 'recording';
        break;
        
      case 'RECORDING_STOP':
        newState.recording.isActive = false;
        newState.recording.mode = 'idle';
        newState.ui.badge.state = 'complete';
        break;
        
      case 'RECORDING_RESET':
        newState.recording = {
          isActive: false,
          sessionId: null,
          startTime: null,
          activeWindow: null,
          mode: 'idle'
        };
        newState.actions.items = [];
        newState.ui.badge.count = 0;
        newState.ui.badge.state = 'idle';
        break;
        
      // ===================================
      // ACTIONS ACTIONS
      // ===================================
      case 'ACTION_ADD':
        newState.actions.items.push(payload.action);
        newState.ui.badge.count = newState.actions.items.length;
        break;
        
      case 'ACTION_UPDATE':
        const updateIndex = newState.actions.items.findIndex(a => a.id === payload.id);
        if (updateIndex !== -1) {
          newState.actions.items[updateIndex] = {
            ...newState.actions.items[updateIndex],
            ...payload.changes
          };
        }
        break;
        
      case 'ACTION_DELETE':
        newState.actions.items = newState.actions.items.filter(a => a.id !== payload.id);
        newState.ui.badge.count = newState.actions.items.length;
        break;
        
      case 'ACTION_REORDER':
        const { fromIndex, toIndex } = payload;
        const [movedAction] = newState.actions.items.splice(fromIndex, 1);
        newState.actions.items.splice(toIndex, 0, movedAction);
        break;
        
      case 'ACTION_SELECT':
        newState.actions.selectedIds.add(payload.id);
        break;
        
      case 'ACTION_DESELECT':
        newState.actions.selectedIds.delete(payload.id);
        break;
        
      case 'ACTIONS_FILTER':
        newState.actions.filters = payload.filters;
        break;
        
      // ===================================
      // TESTS ACTIONS
      // ===================================
      case 'TEST_SAVE':
        newState.tests.saved.push(payload.test);
        break;
        
      case 'TEST_DELETE':
        newState.tests.saved = newState.tests.saved.filter(t => t.id !== payload.id);
        break;
        
      case 'TEST_UPDATE':
        const testIndex = newState.tests.saved.findIndex(t => t.id === payload.id);
        if (testIndex !== -1) {
          newState.tests.saved[testIndex] = {
            ...newState.tests.saved[testIndex],
            ...payload.changes
          };
        }
        break;
        
      case 'TEST_SET_CURRENT':
        newState.tests.current = payload.test;
        break;
        
      // ===================================
      // UI ACTIONS
      // ===================================
      case 'UI_POPUP_STATE':
        newState.ui.popup.state = payload.state;
        break;
        
      case 'UI_POPUP_TOGGLE':
        newState.ui.popup.visible = !newState.ui.popup.visible;
        break;
        
      case 'UI_DASHBOARD_TAB':
        newState.ui.dashboard.activeTab = payload.tab;
        break;
        
      case 'UI_DASHBOARD_TOGGLE':
        newState.ui.dashboard.visible = !newState.ui.dashboard.visible;
        break;
        
      case 'UI_BADGE_UPDATE':
        newState.ui.badge.count = payload.count;
        if (payload.state) {
          newState.ui.badge.state = payload.state;
        }
        break;
        
      // ===================================
      // INTEGRATIONS ACTIONS
      // ===================================
      case 'INTEGRATION_MCP_STATUS':
        newState.integrations.mcp.status = payload.status;
        newState.integrations.mcp.lastPing = Date.now();
        break;
        
      case 'INTEGRATION_GEMINI_STATUS':
        newState.integrations.gemini.status = payload.status;
        newState.integrations.gemini.hasValidKey = payload.hasValidKey || false;
        break;
        
      case 'INTEGRATION_N8N_STATUS':
        newState.integrations.n8n.status = payload.status;
        break;
        
      default:
        console.warn(`⚠️ [Store] Acción desconocida: ${type}`);
    }
    
    return newState;
  }
  
  // ===================================
  // SUBSCRIPTIONS (Observer Pattern)
  // ===================================
  
  /**
   * Suscribirse a cambios de estado
   * @param {string} selector - Path del estado a observar (ej: 'recording.isActive')
   * @param {Function} callback - Función a ejecutar cuando cambia
   * @returns {Function} Unsubscribe function
   */
  subscribe(selector, callback) {
    if (!this.listeners.has(selector)) {
      this.listeners.set(selector, []);
    }
    
    this.listeners.get(selector).push(callback);
    
    console.log(`👂 [Store] Listener añadido para: ${selector}`);
    
    // Retornar función para desuscribir
    return () => {
      const callbacks = this.listeners.get(selector);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`🔇 [Store] Listener removido de: ${selector}`);
      }
    };
  }
  
  /**
   * Notificar a listeners suscritos
   * @private
   */
  notify(actionType, oldState, newState) {
    console.log(`📢 [Store] Notificando listeners para: ${actionType}`);
    
    // Notificar listeners específicos
    this.listeners.forEach((callbacks, selector) => {
      const oldValue = this.getValueByPath(oldState, selector);
      const newValue = this.getValueByPath(newState, selector);
      
      // Solo notificar si cambió el valor
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        callbacks.forEach(callback => {
          try {
            callback(newValue, oldValue, actionType);
          } catch (error) {
            console.error(`❌ [Store] Error en listener ${selector}:`, error);
          }
        });
      }
    });
    
    // Notificar listeners globales (*)
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(newState, oldState, actionType);
        } catch (error) {
          console.error('❌ [Store] Error en listener global:', error);
        }
      });
    }
  }
  
  /**
   * Obtener valor del estado por path
   * @private
   */
  getValueByPath(obj, path) {
    if (path === '*') return obj;
    
    const keys = path.split('.');
    let value = obj;
    
    for (const key of keys) {
      if (value === null || value === undefined) return undefined;
      value = value[key];
    }
    
    return value;
  }
  
  // ===================================
  // GETTERS
  // ===================================
  
  /**
   * Obtener estado completo (read-only)
   */
  getState() {
    // Retornar copia profunda para evitar mutaciones
    return JSON.parse(JSON.stringify(this.state));
  }
  
  /**
   * Obtener valor específico del estado
   */
  get(selector) {
    return this.getValueByPath(this.state, selector);
  }
  
  // ===================================
  // PERSISTENCE
  // ===================================
  
  /**
   * Persistir estado actual a chrome.storage.local
   * @private
   */
  async persist() {
    try {
      // Convertir Sets a Arrays para storage
      const storableState = this.prepareForStorage(this.state);
      
      await chrome.storage.local.set({
        storeState: storableState,
        storeVersion: 1,
        storeLastUpdate: Date.now()
      });
      
      console.log('💾 [Store] Estado persistido correctamente');
    } catch (error) {
      console.error('❌ [Store] Error persistiendo estado:', error);
    }
  }
  
  /**
   * Cargar estado desde chrome.storage.local
   * @private
   */
  async hydrate() {
    try {
      const result = await chrome.storage.local.get(['storeState', 'storeVersion']);
      
      if (result.storeState) {
        // Convertir Arrays a Sets donde corresponda
        const restoredState = this.restoreFromStorage(result.storeState);
        this.state = restoredState;
        console.log('🔄 [Store] Estado cargado desde storage');
      } else {
        console.log('ℹ️ [Store] No hay estado previo, usando default');
      }
    } catch (error) {
      console.error('❌ [Store] Error cargando estado:', error);
      throw error;
    }
  }
  
  /**
   * Preparar estado para storage (convertir Sets, etc)
   * @private
   */
  prepareForStorage(state) {
    const storable = JSON.parse(JSON.stringify(state));
    
    // Convertir Sets a Arrays
    if (state.actions?.selectedIds) {
      storable.actions.selectedIds = Array.from(state.actions.selectedIds);
    }
    if (state.tests?.selectedIds) {
      storable.tests.selectedIds = Array.from(state.tests.selectedIds);
    }
    
    return storable;
  }
  
  /**
   * Restaurar estado desde storage (convertir Arrays a Sets, etc)
   * @private
   */
  restoreFromStorage(storedState) {
    const restored = JSON.parse(JSON.stringify(storedState));
    
    // Convertir Arrays a Sets
    if (Array.isArray(restored.actions?.selectedIds)) {
      restored.actions.selectedIds = new Set(restored.actions.selectedIds);
    }
    if (Array.isArray(restored.tests?.selectedIds)) {
      restored.tests.selectedIds = new Set(restored.tests.selectedIds);
    }
    
    return restored;
  }
  
  /**
   * Limpiar storage completo
   */
  async clear() {
    await chrome.storage.local.remove(['storeState', 'storeVersion', 'storeLastUpdate']);
    console.log('🗑️ [Store] Storage limpiado');
  }
}

// ===================================
// SINGLETON INSTANCE
// ===================================

// Crear instancia única del Store
export const store = new Store();

// Auto-inicializar si estamos en background script
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getBackgroundPage) {
  console.log('🏪 [Store] Auto-inicializando en background...');
  store.initialize().catch(err => {
    console.error('❌ [Store] Error en auto-inicialización:', err);
  });
}

// Exportar para testing
export default store;

console.log('✅ [Store] Módulo cargado correctamente');
