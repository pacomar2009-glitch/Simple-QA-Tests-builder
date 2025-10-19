//
// =====================================================================
// StateService - Service Layer para Gestión de Estado
// =====================================================================
// 
// Propósito:
//   Wrapper del GlobalState con integración al Store centralizado.
//   Proporciona API limpia para operaciones de estado con eventos.
//
// Responsabilidades:
//   - Gestión de estado de grabación (isRecording, sessionId)
//   - Gestión de ventana de test activa
//   - Gestión de acciones capturadas
//   - Sincronización con Store centralizado
//   - Emisión de eventos para observers
//   - Backward compatibility con GlobalState
//
// Arquitectura:
//   - Wrapper del GlobalState existente
//   - Integración bidireccional con Store
//   - Observer pattern para eventos
//   - Auto-sincronización con storage
//
// Uso:
//   import { stateService } from './services/state-service.js';
//   
//   await stateService.startRecording('session-123');
//   await stateService.addAction({ type: 'click', ... });
//   const state = stateService.getState();
//   await stateService.stopRecording();
//
// Eventos emitidos:
//   - recording:started
//   - recording:stopped
//   - action:added
//   - window:opened
//   - window:closed
//   - state:reset
//
// =====================================================================

import { store } from '../shared/store.js';

/**
 * StateService - Gestión centralizada de estado de la extensión
 * 
 * Proporciona API limpia para operaciones de estado con integración
 * al Store centralizado y emisión de eventos para observers.
 */
class StateService {
  constructor() {
    console.log('🔧 [StateService] Initializing...');
    
    // Listeners para eventos
    this._listeners = new Map(); // Map<eventName, Set<callback>>
    
    // Sincronizar con Store al iniciar
    this._syncWithStore();
    
    console.log('✅ [StateService] Initialized successfully');
  }
  
  /**
   * Sincroniza el estado inicial con el Store
   * @private
   */
  _syncWithStore() {
    const storeState = store.getState();
    console.log('🔄 [StateService] Syncing with Store:', storeState.recording);
  }
  
  // ===================================
  // API PÚBLICA - Recording Operations
  // ===================================
  
  /**
   * Inicia una sesión de grabación
   * @param {string} sessionId - ID único de la sesión
   * @param {Object} options - Opciones adicionales
   * @param {number} [options.windowId] - ID de ventana de test
   * @param {number} [options.tabId] - ID de tab de test
   * @param {string} [options.url] - URL inicial
   * @returns {Promise<void>}
   */
  async startRecording(sessionId, options = {}) {
    console.log('▶️  [StateService] Starting recording:', { sessionId, options });
    
    const { windowId = null, tabId = null, url = null } = options;
    
    // Dispatch al Store
    await store.dispatch({
      type: 'RECORDING_START',
      payload: {
        sessionId,
        mode: 'capture', // o 'replay' según contexto
        activeWindow: windowId && tabId ? {
          windowId,
          tabId,
          url,
          startTime: Date.now()
        } : null
      }
    });
    
    // Emit event
    this.emit('recording:started', { sessionId, windowId, tabId, url });
    
    console.log('✅ [StateService] Recording started successfully');
  }
  
  /**
   * Detiene la sesión de grabación actual
   * @returns {Promise<void>}
   */
  async stopRecording() {
    console.log('⏸️  [StateService] Stopping recording...');
    
    const currentState = store.get('recording');
    const sessionId = currentState.sessionId;
    
    // Dispatch al Store
    await store.dispatch({
      type: 'RECORDING_STOP',
      payload: {
        sessionId,
        endTime: Date.now()
      }
    });
    
    // Emit event
    this.emit('recording:stopped', { sessionId });
    
    console.log('✅ [StateService] Recording stopped successfully');
  }
  
  /**
   * Pausa la grabación actual (sin detenerla)
   * @returns {Promise<void>}
   */
  async pauseRecording() {
    console.log('⏸️  [StateService] Pausing recording...');
    
    await store.dispatch({
      type: 'RECORDING_PAUSE',
      payload: { timestamp: Date.now() }
    });
    
    this.emit('recording:paused', {});
    
    console.log('✅ [StateService] Recording paused');
  }
  
  /**
   * Reanuda la grabación pausada
   * @returns {Promise<void>}
   */
  async resumeRecording() {
    console.log('▶️  [StateService] Resuming recording...');
    
    await store.dispatch({
      type: 'RECORDING_RESUME',
      payload: { timestamp: Date.now() }
    });
    
    this.emit('recording:resumed', {});
    
    console.log('✅ [StateService] Recording resumed');
  }
  
  // ===================================
  // API PÚBLICA - Action Operations
  // ===================================
  
  /**
   * Agrega una acción capturada
   * @param {Object} action - Acción a agregar
   * @returns {Promise<string>} ID de la acción agregada
   */
  async addAction(action) {
    console.log('➕ [StateService] Adding action:', action.type);
    
    // Generar ID si no existe
    const actionId = action.id || `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const actionWithId = {
      ...action,
      id: actionId,
      timestamp: action.timestamp || Date.now()
    };
    
    // Dispatch al Store
    await store.dispatch({
      type: 'ACTION_ADD',
      payload: actionWithId
    });
    
    // Emit event
    this.emit('action:added', actionWithId);
    
    console.log('✅ [StateService] Action added:', actionId);
    return actionId;
  }
  
  /**
   * Actualiza una acción existente
   * @param {string} actionId - ID de la acción
   * @param {Object} updates - Campos a actualizar
   * @returns {Promise<void>}
   */
  async updateAction(actionId, updates) {
    console.log('✏️  [StateService] Updating action:', actionId);
    
    await store.dispatch({
      type: 'ACTION_UPDATE',
      payload: {
        id: actionId,
        updates
      }
    });
    
    this.emit('action:updated', { id: actionId, updates });
    
    console.log('✅ [StateService] Action updated');
  }
  
  /**
   * Elimina una acción
   * @param {string} actionId - ID de la acción a eliminar
   * @returns {Promise<void>}
   */
  async deleteAction(actionId) {
    console.log('🗑️  [StateService] Deleting action:', actionId);
    
    await store.dispatch({
      type: 'ACTION_DELETE',
      payload: { id: actionId }
    });
    
    this.emit('action:deleted', { id: actionId });
    
    console.log('✅ [StateService] Action deleted');
  }
  
  /**
   * Reordena acciones
   * @param {string[]} newOrder - Array de IDs en nuevo orden
   * @returns {Promise<void>}
   */
  async reorderActions(newOrder) {
    console.log('🔄 [StateService] Reordering actions:', newOrder.length);
    
    await store.dispatch({
      type: 'ACTION_REORDER',
      payload: { newOrder }
    });
    
    this.emit('actions:reordered', { newOrder });
    
    console.log('✅ [StateService] Actions reordered');
  }
  
  // ===================================
  // API PÚBLICA - Window Management
  // ===================================
  
  /**
   * Abre una ventana de test
   * @param {Object} windowInfo - Información de la ventana
   * @returns {Promise<void>}
   */
  async openTestWindow(windowInfo) {
    console.log('🪟 [StateService] Opening test window:', windowInfo);
    
    await store.dispatch({
      type: 'RECORDING_SET_WINDOW',
      payload: {
        windowId: windowInfo.windowId,
        tabId: windowInfo.tabId,
        url: windowInfo.url,
        startTime: Date.now()
      }
    });
    
    this.emit('window:opened', windowInfo);
    
    console.log('✅ [StateService] Test window opened');
  }
  
  /**
   * Cierra la ventana de test activa
   * @returns {Promise<number|null>} windowId cerrado o null
   */
  async closeTestWindow() {
    console.log('🪟 [StateService] Closing test window...');
    
    const currentWindow = store.get('recording.activeWindow');
    
    if (currentWindow) {
      await store.dispatch({
        type: 'RECORDING_CLEAR_WINDOW',
        payload: {}
      });
      
      this.emit('window:closed', { windowId: currentWindow.windowId });
      
      console.log('✅ [StateService] Test window closed:', currentWindow.windowId);
      return currentWindow.windowId;
    }
    
    console.log('⚠️  [StateService] No active test window to close');
    return null;
  }
  
  // ===================================
  // API PÚBLICA - State Management
  // ===================================
  
  /**
   * Obtiene el estado actual completo
   * @returns {Object} Estado completo
   */
  getState() {
    const state = store.getState();
    return {
      isRecording: state.recording.isActive,
      sessionId: state.recording.sessionId,
      activeWindow: state.recording.activeWindow,
      capturedSteps: state.actions.items,
      mode: state.recording.mode
    };
  }
  
  /**
   * Obtiene solo el estado de grabación
   * @returns {Object} Estado de grabación
   */
  getRecordingState() {
    return store.get('recording');
  }
  
  /**
   * Obtiene las acciones capturadas
   * @returns {Array} Array de acciones
   */
  getActions() {
    return store.get('actions.items');
  }
  
  /**
   * Obtiene la ventana activa
   * @returns {Object|null} Información de ventana o null
   */
  getActiveWindow() {
    return store.get('recording.activeWindow');
  }
  
  /**
   * Resetea el estado a valores iniciales
   * @returns {Promise<void>}
   */
  async reset() {
    console.log('🔄 [StateService] Resetting state...');
    
    await store.dispatch({
      type: 'RECORDING_RESET',
      payload: {}
    });
    
    this.emit('state:reset', {});
    
    console.log('✅ [StateService] State reset successfully');
  }
  
  // ===================================
  // API PÚBLICA - Event System (Observer Pattern)
  // ===================================
  
  /**
   * Registra un listener para un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función callback
   * @returns {Function} Función para desuscribirse
   */
  on(eventName, callback) {
    if (typeof callback !== 'function') {
      console.error('❌ [StateService] Callback must be a function');
      return () => {};
    }
    
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    
    this._listeners.get(eventName).add(callback);
    
    console.log(`🔔 [StateService] Listener registered for '${eventName}'`);
    
    // Retornar función de unsubscribe
    return () => {
      const listeners = this._listeners.get(eventName);
      if (listeners) {
        listeners.delete(callback);
        console.log(`🔕 [StateService] Listener unregistered for '${eventName}'`);
      }
    };
  }
  
  /**
   * Emite un evento a todos los listeners
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos del evento
   */
  emit(eventName, data) {
    const listeners = this._listeners.get(eventName);
    
    if (listeners && listeners.size > 0) {
      console.log(`📢 [StateService] Emitting '${eventName}' to ${listeners.size} listeners`);
      
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ [StateService] Error in listener for '${eventName}':`, error);
        }
      });
    }
  }
  
  /**
   * Elimina todos los listeners de un evento (o todos)
   * @param {string} [eventName] - Nombre del evento (opcional)
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this._listeners.delete(eventName);
      console.log(`🔕 [StateService] All listeners removed for '${eventName}'`);
    } else {
      this._listeners.clear();
      console.log('🔕 [StateService] All listeners removed');
    }
  }
  
  // ===================================
  // BACKWARD COMPATIBILITY
  // ===================================
  
  /**
   * Compatibilidad con GlobalState.isRecording
   * @returns {boolean}
   */
  get isRecording() {
    return store.get('recording.isActive');
  }
  
  /**
   * Compatibilidad con GlobalState.sessionId
   * @returns {string|null}
   */
  get sessionId() {
    return store.get('recording.sessionId');
  }
  
  /**
   * Compatibilidad con GlobalState.activeTestWindow
   * @returns {Object|null}
   */
  get activeTestWindow() {
    return store.get('recording.activeWindow');
  }
  
  /**
   * Compatibilidad con GlobalState.capturedSteps
   * @returns {Array}
   */
  get capturedSteps() {
    return store.get('actions.items');
  }
}

// ===================================
// SINGLETON EXPORT
// ===================================

export const stateService = new StateService();

// Auto-inicialización
console.log('✅ [StateService] Module loaded and singleton created');

export default stateService;
