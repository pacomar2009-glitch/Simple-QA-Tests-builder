// ===================================
// 🔗 PHASE 1 INTEGRATION - Real Implementation
// ===================================
// Integración completa de todos los módulos Phase 1
// Demuestra el uso real (no mock) de Store, BadgeManager, StateService, StorageService

console.log('🔗 [Phase1Integration] Initializing Phase 1 modules...');

// ===================================
// IMPORTS - Módulos Phase 1
// ===================================
import { store } from '../shared/store.js';
import { badgeManager } from '../badge/badge-manager.js';
import { stateService } from './services/state-service.js';
import { storageService } from './services/storage-service.js';

/**
 * Phase1Integration - Orchestrator de módulos Phase 1
 * 
 * Responsabilidades:
 * - Inicializar todos los módulos Phase 1
 * - Setup de event listeners y subscriptions
 * - Coordinación entre módulos
 * - Sincronización de estado
 */
class Phase1Integration {
  constructor() {
    console.log('🔗 [Phase1Integration] Constructor called');
    this.initialized = false;
    this.subscriptions = [];
  }
  
  /**
   * Inicializa todos los módulos Phase 1
   */
  async initialize() {
    if (this.initialized) {
      console.warn('⚠️ [Phase1Integration] Already initialized, skipping');
      return;
    }
    
    console.log('🔗 [Phase1Integration] Starting initialization...');
    
    try {
      // 1. Inicializar Store (carga desde storage)
      console.log('📦 [Phase1Integration] Initializing Store...');
      await store.initialize();
      
      // 2. Verificar migration de storage
      console.log('💾 [Phase1Integration] Checking storage migration...');
      await storageService.migrateFromV1();
      
      // 3. Setup de event listeners
      console.log('🎧 [Phase1Integration] Setting up event listeners...');
      this.setupEventListeners();
      
      // 4. Setup de Store subscriptions
      console.log('👀 [Phase1Integration] Setting up Store subscriptions...');
      this.setupStoreSubscriptions();
      
      // 5. Sincronizar estado inicial
      console.log('🔄 [Phase1Integration] Syncing initial state...');
      await this.syncInitialState();
      
      this.initialized = true;
      console.log('✅ [Phase1Integration] Initialization complete');
      
      // Log diagnostics
      await this.logDiagnostics();
      
    } catch (error) {
      console.error('❌ [Phase1Integration] Initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * Setup de event listeners de StateService
   */
  setupEventListeners() {
    // Recording events
    stateService.on('recording:started', ({ sessionId, windowId, tabId }) => {
      console.log('🎬 [Phase1Integration] Recording started:', { sessionId, windowId, tabId });
      badgeManager.setRecording(true);
    });
    
    stateService.on('recording:stopped', ({ sessionId }) => {
      console.log('⏹️ [Phase1Integration] Recording stopped:', { sessionId });
      badgeManager.setRecording(false);
      
      // Show save dialog or auto-save
      const actions = stateService.getActions();
      if (actions.length > 0) {
        this.handleRecordingComplete(actions);
      }
    });
    
    // Action events
    stateService.on('action:added', ({ action }) => {
      console.log('➕ [Phase1Integration] Action added:', action.type);
      const count = stateService.getActions().length;
      badgeManager.updateCount(count);
    });
    
    stateService.on('action:deleted', ({ id }) => {
      console.log('➖ [Phase1Integration] Action deleted:', id);
      const count = stateService.getActions().length;
      badgeManager.updateCount(count);
    });
    
    // Window events
    stateService.on('window:opened', ({ windowInfo }) => {
      console.log('🪟 [Phase1Integration] Test window opened:', windowInfo);
    });
    
    stateService.on('window:closed', ({ windowId }) => {
      console.log('🪟 [Phase1Integration] Test window closed:', windowId);
    });
    
    // State reset
    stateService.on('state:reset', () => {
      console.log('🔄 [Phase1Integration] State reset');
      badgeManager.reset();
    });
    
    console.log('✅ [Phase1Integration] Event listeners configured');
  }
  
  /**
   * Setup de Store subscriptions (reactive updates)
   */
  setupStoreSubscriptions() {
    // Subscribe to recording state changes
    const unsubRecording = store.subscribe('recording.isActive', (isActive) => {
      console.log('👀 [Phase1Integration] Recording state changed:', isActive);
      badgeManager.setRecording(isActive);
    });
    this.subscriptions.push(unsubRecording);
    
    // Subscribe to actions count changes
    const unsubActions = store.subscribe('actions.items', (actions) => {
      console.log('👀 [Phase1Integration] Actions updated:', actions.length);
      badgeManager.updateCount(actions.length);
    });
    this.subscriptions.push(unsubActions);
    
    // Subscribe to badge state changes
    const unsubBadge = store.subscribe('ui.badge', (badge) => {
      console.log('👀 [Phase1Integration] Badge state changed:', badge);
      badgeManager.updateBadge(badge.count, badge.state.toUpperCase());
    });
    this.subscriptions.push(unsubBadge);
    
    // Debug: Subscribe to all changes (wildcard)
    const unsubAll = store.subscribe('*', (newValue, oldValue, actionType) => {
      console.log('🔍 [Phase1Integration] Store updated:', {
        action: actionType,
        hasChange: newValue !== oldValue
      });
    });
    this.subscriptions.push(unsubAll);
    
    console.log('✅ [Phase1Integration] Store subscriptions configured');
  }
  
  /**
   * Sincroniza el estado inicial desde storage
   */
  async syncInitialState() {
    const state = store.getState();
    
    // Sync badge with current state
    badgeManager.updateBadge(
      state.ui.badge.count,
      state.ui.badge.state.toUpperCase()
    );
    
    // Sync recording state
    if (state.recording.isActive) {
      badgeManager.setRecording(true);
      console.log('🎬 [Phase1Integration] Restored active recording:', state.recording.sessionId);
    }
    
    console.log('✅ [Phase1Integration] Initial state synced');
  }
  
  /**
   * Maneja la finalización de una grabación
   */
  async handleRecordingComplete(actions) {
    console.log('💾 [Phase1Integration] Handling recording complete:', actions.length, 'actions');
    
    try {
      // Auto-save test
      const testId = await storageService.saveTest({
        name: `Recording ${new Date().toLocaleString()}`,
        steps: actions,
        savedAt: Date.now(),
        source: 'auto-save'
      });
      
      console.log('✅ [Phase1Integration] Test auto-saved:', testId);
      
      // Update badge to complete state
      badgeManager.updateBadge(actions.length, 'COMPLETE');
      
      // Optional: Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icon.png',
        title: 'Recording Complete',
        message: `Test saved with ${actions.length} actions`
      });
      
    } catch (error) {
      console.error('❌ [Phase1Integration] Error saving test:', error);
      badgeManager.setError(error.message);
    }
  }
  
  /**
   * Log diagnostics information
   */
  async logDiagnostics() {
    console.group('📊 [Phase1Integration] Diagnostics');
    
    // Store state
    const state = store.getState();
    console.log('Store State:', {
      recording: state.recording.isActive,
      actionsCount: state.actions.items.length,
      testsCount: state.tests.saved.length,
      badgeCount: state.ui.badge.count,
      badgeState: state.ui.badge.state
    });
    
    // Storage diagnostics
    const diag = await storageService.getDiagnostics();
    console.log('Storage Diagnostics:', {
      version: diag.version,
      keys: diag.totalKeys,
      size: diag.kilobytesInUse + ' KB',
      tests: diag.testsCount
    });
    
    // Badge state
    console.log('Badge State:', {
      state: badgeManager.currentState,
      count: badgeManager.currentCount
    });
    
    console.groupEnd();
  }
  
  /**
   * Cleanup - Unsubscribe from all subscriptions
   */
  cleanup() {
    console.log('🧹 [Phase1Integration] Cleaning up...');
    
    // Unsubscribe from Store
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
    
    // Remove StateService listeners
    stateService.removeAllListeners();
    
    console.log('✅ [Phase1Integration] Cleanup complete');
  }
}

// ===================================
// SINGLETON INSTANCE & AUTO-INIT
// ===================================
export const phase1Integration = new Phase1Integration();

// Auto-initialize on background script load
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('🚀 [Phase1Integration] Auto-initializing...');
  
  phase1Integration.initialize().then(() => {
    console.log('✅ [Phase1Integration] Auto-initialization complete');
  }).catch(error => {
    console.error('❌ [Phase1Integration] Auto-initialization failed:', error);
  });
}

// Export for manual control if needed
export default phase1Integration;

console.log('✅ [Phase1Integration] Module loaded');
