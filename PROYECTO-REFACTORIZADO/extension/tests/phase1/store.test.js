/**
 * Store - Unit Tests
 * 
 * Test Suite para Store centralizado (Redux-like pattern)
 * 20 test cases cubriendo:
 * - Inicialización
 * - Dispatch de acciones
 * - Subscriptions (Observer pattern)
 * - Persistence (chrome.storage)
 * - State management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { store } from '../../src/shared/store.js';

describe('Store - Centralized State Management', () => {
  
  beforeEach(async () => {
    // Reset store antes de cada test
    await store.dispatch({ type: 'RECORDING_RESET', payload: {} });
    chrome.__resetAll();
  });
  
  // ===================================
  // SUITE 1: Inicialización (3 tests)
  // ===================================
  
  describe('Initialization', () => {
    
    it('should initialize with default state structure', () => {
      const state = store.getState();
      
      expect(state).toHaveProperty('recording');
      expect(state).toHaveProperty('actions');
      expect(state).toHaveProperty('tests');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('integrations');
    });
    
    it('should have correct recording initial state', () => {
      const recording = store.get('recording');
      
      expect(recording.isActive).toBe(false);
      expect(recording.sessionId).toBeNull();
      expect(recording.activeWindow).toBeNull();
      expect(recording.mode).toBe('capture');
    });
    
    it('should have empty actions array initially', () => {
      const actions = store.get('actions.items');
      
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBe(0);
    });
  });
  
  // ===================================
  // SUITE 2: Dispatch Actions (5 tests)
  // ===================================
  
  describe('Dispatch Actions', () => {
    
    it('should dispatch RECORDING_START and update state', async () => {
      await store.dispatch({
        type: 'RECORDING_START',
        payload: {
          sessionId: 'test-session-123',
          mode: 'capture'
        }
      });
      
      const recording = store.get('recording');
      expect(recording.isActive).toBe(true);
      expect(recording.sessionId).toBe('test-session-123');
      expect(recording.mode).toBe('capture');
    });
    
    it('should dispatch RECORDING_STOP and update state', async () => {
      // Start first
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'test-123' }
      });
      
      // Then stop
      await store.dispatch({
        type: 'RECORDING_STOP',
        payload: {}
      });
      
      const recording = store.get('recording');
      expect(recording.isActive).toBe(false);
      expect(recording.sessionId).toBe('test-123'); // Session ID persiste
    });
    
    it('should dispatch ACTION_ADD and append to actions', async () => {
      const action = {
        id: 'action-1',
        type: 'click',
        selector: '#button',
        timestamp: Date.now()
      };
      
      await store.dispatch({
        type: 'ACTION_ADD',
        payload: action
      });
      
      const actions = store.get('actions.items');
      expect(actions.length).toBe(1);
      expect(actions[0]).toMatchObject(action);
    });
    
    it('should dispatch ACTION_UPDATE and modify existing action', async () => {
      // Add action first
      await store.dispatch({
        type: 'ACTION_ADD',
        payload: { id: 'action-1', type: 'click', value: 'old' }
      });
      
      // Update it
      await store.dispatch({
        type: 'ACTION_UPDATE',
        payload: {
          id: 'action-1',
          updates: { value: 'new', edited: true }
        }
      });
      
      const actions = store.get('actions.items');
      const updated = actions.find(a => a.id === 'action-1');
      
      expect(updated.value).toBe('new');
      expect(updated.edited).toBe(true);
    });
    
    it('should dispatch ACTION_DELETE and remove action', async () => {
      // Add two actions
      await store.dispatch({
        type: 'ACTION_ADD',
        payload: { id: 'action-1', type: 'click' }
      });
      await store.dispatch({
        type: 'ACTION_ADD',
        payload: { id: 'action-2', type: 'type' }
      });
      
      // Delete one
      await store.dispatch({
        type: 'ACTION_DELETE',
        payload: { id: 'action-1' }
      });
      
      const actions = store.get('actions.items');
      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe('action-2');
    });
  });
  
  // ===================================
  // SUITE 3: Subscriptions (5 tests)
  // ===================================
  
  describe('Subscriptions (Observer Pattern)', () => {
    
    it('should subscribe to state changes with selector', async () => {
      const callback = jest.fn();
      
      store.subscribe('recording.isActive', callback);
      
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'test' }
      });
      
      expect(callback).toHaveBeenCalledWith(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });
    
    it('should not call callback if value does not change', async () => {
      const callback = jest.fn();
      
      store.subscribe('recording.isActive', callback);
      
      // Dispatch action that doesn't change isActive
      await store.dispatch({
        type: 'UI_BADGE_UPDATE',
        payload: { count: 5 }
      });
      
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('should support multiple subscribers for same selector', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      store.subscribe('recording.sessionId', callback1);
      store.subscribe('recording.sessionId', callback2);
      
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'multi-test' }
      });
      
      expect(callback1).toHaveBeenCalledWith('multi-test');
      expect(callback2).toHaveBeenCalledWith('multi-test');
    });
    
    it('should unsubscribe when calling returned function', async () => {
      const callback = jest.fn();
      
      const unsubscribe = store.subscribe('recording.isActive', callback);
      
      // First dispatch - should call
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'test' }
      });
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      
      // Second dispatch - should NOT call
      await store.dispatch({
        type: 'RECORDING_STOP',
        payload: {}
      });
      expect(callback).toHaveBeenCalledTimes(1); // Still 1
    });
    
    it('should support wildcard subscription for all changes', async () => {
      const callback = jest.fn();
      
      store.subscribe('*', callback);
      
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'test' }
      });
      
      expect(callback).toHaveBeenCalledWith(store.getState());
    });
  });
  
  // ===================================
  // SUITE 4: Persistence (4 tests)
  // ===================================
  
  describe('Persistence (chrome.storage)', () => {
    
    it('should persist state to chrome.storage on dispatch', async () => {
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'persist-test' }
      });
      
      expect(chrome.storage.local.set).toHaveBeenCalled();
      
      const savedData = chrome.storage.local.data['store:state'];
      expect(savedData).toBeDefined();
      expect(savedData.recording.sessionId).toBe('persist-test');
    });
    
    it('should hydrate state from chrome.storage on initialize', async () => {
      // Pre-populate storage
      chrome.storage.local.data['store:state'] = {
        recording: {
          isActive: true,
          sessionId: 'hydrate-test',
          activeWindow: null,
          mode: 'capture'
        },
        actions: { items: [], selectedIds: new Set(), filters: {} },
        tests: { saved: {}, current: null, selectedIds: new Set() },
        ui: { popup: {}, dashboard: {}, badge: {} },
        integrations: { mcp: {}, gemini: {}, n8n: {} }
      };
      
      await store.initialize();
      
      const recording = store.get('recording');
      expect(recording.sessionId).toBe('hydrate-test');
      expect(recording.isActive).toBe(true);
    });
    
    it('should convert Sets to Arrays when persisting', async () => {
      await store.dispatch({
        type: 'ACTION_SELECT',
        payload: { id: 'action-1' }
      });
      
      const savedData = chrome.storage.local.data['store:state'];
      const selectedIds = savedData.actions.selectedIds;
      
      expect(Array.isArray(selectedIds)).toBe(true);
    });
    
    it('should convert Arrays to Sets when hydrating', async () => {
      chrome.storage.local.data['store:state'] = {
        recording: { isActive: false, sessionId: null, activeWindow: null, mode: 'capture' },
        actions: { 
          items: [], 
          selectedIds: ['action-1', 'action-2'], // Array in storage
          filters: {} 
        },
        tests: { saved: {}, current: null, selectedIds: [] },
        ui: { popup: {}, dashboard: {}, badge: {} },
        integrations: { mcp: {}, gemini: {}, n8n: {} }
      };
      
      await store.initialize();
      
      const selectedIds = store.get('actions.selectedIds');
      expect(selectedIds instanceof Set).toBe(true);
      expect(selectedIds.size).toBe(2);
    });
  });
  
  // ===================================
  // SUITE 5: State Management (3 tests)
  // ===================================
  
  describe('State Management', () => {
    
    it('should get nested state with path selector', () => {
      const sessionId = store.get('recording.sessionId');
      expect(sessionId).toBeNull(); // Initial value
    });
    
    it('should get full state with getState()', () => {
      const state = store.getState();
      
      expect(state).toHaveProperty('recording');
      expect(state).toHaveProperty('actions');
      expect(state).toHaveProperty('tests');
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('integrations');
    });
    
    it('should reset state to initial values with RECORDING_RESET', async () => {
      // Modify state
      await store.dispatch({
        type: 'RECORDING_START',
        payload: { sessionId: 'to-reset' }
      });
      await store.dispatch({
        type: 'ACTION_ADD',
        payload: { id: 'action-1', type: 'click' }
      });
      
      // Reset
      await store.dispatch({
        type: 'RECORDING_RESET',
        payload: {}
      });
      
      const recording = store.get('recording');
      const actions = store.get('actions.items');
      
      expect(recording.isActive).toBe(false);
      expect(recording.sessionId).toBeNull();
      expect(actions.length).toBe(0);
    });
  });
  
});
