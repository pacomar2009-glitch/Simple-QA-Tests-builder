/**
 * StateService - Unit Tests
 * 
 * Test Suite para StateService
 * 15 test cases cubriendo:
 * - Recording operations (start, stop, pause, resume)
 * - Action operations (add, update, delete, reorder)
 * - Window management
 * - Event system (Observer pattern)
 * - Backward compatibility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { stateService } from '../../src/background/services/state-service.js';
import { store } from '../../src/shared/store.js';

describe('StateService - State Management Layer', () => {
  
  beforeEach(async () => {
    chrome.__resetAll();
    await store.dispatch({ type: 'RECORDING_RESET', payload: {} });
    stateService.removeAllListeners();
  });
  
  // ===================================
  // SUITE 1: Recording Operations (4 tests)
  // ===================================
  
  describe('Recording Operations', () => {
    
    it('should start recording and update Store', async () => {
      await stateService.startRecording('session-123', {
        windowId: 1,
        tabId: 10,
        url: 'https://example.com'
      });
      
      const state = stateService.getRecordingState();
      expect(state.isActive).toBe(true);
      expect(state.sessionId).toBe('session-123');
      expect(state.activeWindow).toMatchObject({
        windowId: 1,
        tabId: 10,
        url: 'https://example.com'
      });
    });
    
    it('should stop recording and emit event', async () => {
      const stopListener = jest.fn();
      stateService.on('recording:stopped', stopListener);
      
      await stateService.startRecording('session-123');
      await stateService.stopRecording();
      
      const state = stateService.getRecordingState();
      expect(state.isActive).toBe(false);
      expect(stopListener).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'session-123' })
      );
    });
    
    it('should pause and resume recording', async () => {
      await stateService.startRecording('session-123');
      
      await stateService.pauseRecording();
      // Note: Store doesn't have isPaused in current implementation
      // This tests the API exists and doesn't throw
      
      await stateService.resumeRecording();
      
      const state = stateService.getRecordingState();
      expect(state.isActive).toBe(true);
    });
    
    it('should emit recording:started event', async () => {
      const startListener = jest.fn();
      stateService.on('recording:started', startListener);
      
      await stateService.startRecording('session-test', {
        windowId: 5,
        tabId: 50
      });
      
      expect(startListener).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-test',
          windowId: 5,
          tabId: 50
        })
      );
    });
  });
  
  // ===================================
  // SUITE 2: Action Operations (4 tests)
  // ===================================
  
  describe('Action Operations', () => {
    
    it('should add action and return actionId', async () => {
      const action = {
        type: 'click',
        selector: '#button',
        timestamp: Date.now()
      };
      
      const actionId = await stateService.addAction(action);
      
      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');
      
      const actions = stateService.getActions();
      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe(actionId);
    });
    
    it('should update existing action', async () => {
      const actionId = await stateService.addAction({
        type: 'type',
        value: 'old-value'
      });
      
      await stateService.updateAction(actionId, {
        value: 'new-value',
        edited: true
      });
      
      const actions = stateService.getActions();
      const updated = actions.find(a => a.id === actionId);
      
      expect(updated.value).toBe('new-value');
      expect(updated.edited).toBe(true);
    });
    
    it('should delete action and emit event', async () => {
      const deleteListener = jest.fn();
      stateService.on('action:deleted', deleteListener);
      
      const actionId = await stateService.addAction({ type: 'click' });
      await stateService.deleteAction(actionId);
      
      const actions = stateService.getActions();
      expect(actions.length).toBe(0);
      
      expect(deleteListener).toHaveBeenCalledWith(
        expect.objectContaining({ id: actionId })
      );
    });
    
    it('should reorder actions', async () => {
      const id1 = await stateService.addAction({ type: 'click', order: 1 });
      const id2 = await stateService.addAction({ type: 'type', order: 2 });
      const id3 = await stateService.addAction({ type: 'select', order: 3 });
      
      // Reorder: 3, 1, 2
      await stateService.reorderActions([id3, id1, id2]);
      
      const actions = stateService.getActions();
      expect(actions[0].id).toBe(id3);
      expect(actions[1].id).toBe(id1);
      expect(actions[2].id).toBe(id2);
    });
  });
  
  // ===================================
  // SUITE 3: Window Management (3 tests)
  // ===================================
  
  describe('Window Management', () => {
    
    it('should open test window and emit event', async () => {
      const windowListener = jest.fn();
      stateService.on('window:opened', windowListener);
      
      await stateService.openTestWindow({
        windowId: 100,
        tabId: 200,
        url: 'https://test.com'
      });
      
      const activeWindow = stateService.getActiveWindow();
      expect(activeWindow.windowId).toBe(100);
      expect(activeWindow.tabId).toBe(200);
      
      expect(windowListener).toHaveBeenCalledWith(
        expect.objectContaining({ windowId: 100 })
      );
    });
    
    it('should close test window and return windowId', async () => {
      await stateService.openTestWindow({
        windowId: 50,
        tabId: 60
      });
      
      const closedWindowId = await stateService.closeTestWindow();
      
      expect(closedWindowId).toBe(50);
      
      const activeWindow = stateService.getActiveWindow();
      expect(activeWindow).toBeNull();
    });
    
    it('should return null when closing non-existent window', async () => {
      const closedWindowId = await stateService.closeTestWindow();
      
      expect(closedWindowId).toBeNull();
    });
  });
  
  // ===================================
  // SUITE 4: Event System (2 tests)
  // ===================================
  
  describe('Event System (Observer Pattern)', () => {
    
    it('should register listener and call on emit', async () => {
      const listener = jest.fn();
      
      stateService.on('action:added', listener);
      await stateService.addAction({ type: 'click' });
      
      expect(listener).toHaveBeenCalled();
    });
    
    it('should unsubscribe when calling returned function', async () => {
      const listener = jest.fn();
      
      const unsubscribe = stateService.on('action:added', listener);
      
      await stateService.addAction({ type: 'click' });
      expect(listener).toHaveBeenCalledTimes(1);
      
      unsubscribe();
      
      await stateService.addAction({ type: 'type' });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1
    });
  });
  
  // ===================================
  // SUITE 5: Backward Compatibility (2 tests)
  // ===================================
  
  describe('Backward Compatibility', () => {
    
    it('should expose isRecording property', async () => {
      expect(stateService.isRecording).toBe(false);
      
      await stateService.startRecording('test');
      
      expect(stateService.isRecording).toBe(true);
    });
    
    it('should expose sessionId, activeTestWindow, capturedSteps properties', async () => {
      await stateService.startRecording('compat-test', {
        windowId: 1,
        tabId: 2
      });
      
      await stateService.addAction({ type: 'click' });
      
      expect(stateService.sessionId).toBe('compat-test');
      expect(stateService.activeTestWindow).toMatchObject({
        windowId: 1,
        tabId: 2
      });
      expect(Array.isArray(stateService.capturedSteps)).toBe(true);
      expect(stateService.capturedSteps.length).toBe(1);
    });
  });
  
});
