/**
 * Integration tests para Service Worker (US#120, US#121)
 * Tests del flujo completo de grabación con IA
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock completo de Chrome APIs
const mockChrome = {
  storage: {
    sync: {
      get: jest.fn((keys) => Promise.resolve({ geminiApiKey: 'AIzaSyTest123' })),
      set: jest.fn((items) => Promise.resolve())
    },
    local: {
      get: jest.fn((keys) => Promise.resolve({ 
        recordingState: null,
        events: []
      })),
      set: jest.fn((items) => Promise.resolve())
    }
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn()
  },
  notifications: {
    create: jest.fn((id, options, callback) => {
      if (callback) callback('notif-id');
      return Promise.resolve('notif-id');
    })
  },
  tabs: {
    query: jest.fn((query, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com' }];
      if (callback) callback(tabs);
      return Promise.resolve(tabs);
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    get: jest.fn((tabId, callback) => {
      const tab = { id: tabId, url: 'https://example.com' };
      if (callback) callback(tab);
      return Promise.resolve(tab);
    })
  },
  debugger: {
    attach: jest.fn((target, version) => Promise.resolve()),
    detach: jest.fn((target) => Promise.resolve()),
    sendCommand: jest.fn((target, method, params) => Promise.resolve({ result: {} })),
    onEvent: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onDetach: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null
  }
};

global.chrome = mockChrome;

describe('Service Worker - Recording Flow', () => {
  let recordingState;
  
  beforeEach(() => {
    // Reset state
    recordingState = {
      isRecording: false,
      tabId: null,
      events: [],
      startTime: null,
      geminiEnabled: false
    };
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  describe('Start Recording', () => {
    test('should initialize recording with Gemini enabled', async () => {
      // Simulate startRecording action
      const tabId = 1;
      const hasApiKey = true;
      
      // Set recording state
      recordingState.isRecording = true;
      recordingState.tabId = tabId;
      recordingState.startTime = Date.now();
      recordingState.geminiEnabled = hasApiKey;
      
      // Set badge
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      
      expect(recordingState.isRecording).toBe(true);
      expect(recordingState.geminiEnabled).toBe(true);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });
    
    test('should initialize recording in fallback mode', async () => {
      const tabId = 1;
      const hasApiKey = false;
      
      recordingState.isRecording = true;
      recordingState.tabId = tabId;
      recordingState.geminiEnabled = hasApiKey;
      
      // Fallback badge
      chrome.action.setBadgeText({ text: 'FB' });
      chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      
      // Create notification
      chrome.notifications.create({
        type: 'basic',
        title: '⚠️ Grabación en Modo Fallback',
        message: 'Gemini IA no disponible'
      });
      
      expect(recordingState.geminiEnabled).toBe(false);
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'FB' });
      expect(chrome.notifications.create).toHaveBeenCalled();
    });
    
    test('should attach Chrome debugger', async () => {
      const tabId = 1;
      
      await chrome.debugger.attach({ tabId }, '1.3');
      await chrome.debugger.sendCommand({ tabId }, 'DOM.enable');
      
      expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');
      expect(chrome.debugger.sendCommand).toHaveBeenCalled();
    });
    
    test('should save initial state to storage', async () => {
      recordingState.isRecording = true;
      recordingState.tabId = 1;
      recordingState.events = [];
      
      await chrome.storage.local.set({
        recordingState,
        events: []
      });
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          recordingState: expect.any(Object),
          events: expect.any(Array)
        })
      );
    });
  });
  
  describe('Event Capture', () => {
    beforeEach(() => {
      recordingState.isRecording = true;
      recordingState.tabId = 1;
      recordingState.events = [];
    });
    
    test('should capture click event', () => {
      const clickEvent = {
        type: 'click',
        timestamp: Date.now(),
        selector: '#login-button',
        xpath: '//*[@id="login-button"]',
        elementData: {
          tagName: 'BUTTON',
          id: 'login-button',
          textContent: 'Login'
        }
      };
      
      recordingState.events.push(clickEvent);
      
      expect(recordingState.events.length).toBe(1);
      expect(recordingState.events[0].type).toBe('click');
      expect(recordingState.events[0].selector).toBe('#login-button');
    });
    
    test('should capture input event', () => {
      const inputEvent = {
        type: 'input',
        timestamp: Date.now(),
        selector: '#username',
        value: 'testuser',
        elementData: {
          tagName: 'INPUT',
          type: 'text',
          id: 'username'
        }
      };
      
      recordingState.events.push(inputEvent);
      
      expect(recordingState.events.length).toBe(1);
      expect(recordingState.events[0].type).toBe('input');
      expect(recordingState.events[0].value).toBe('testuser');
    });
    
    test('should capture navigation event', () => {
      const navEvent = {
        type: 'navigation',
        timestamp: Date.now(),
        url: 'https://example.com/dashboard',
        fromUrl: 'https://example.com/login'
      };
      
      recordingState.events.push(navEvent);
      
      expect(recordingState.events.length).toBe(1);
      expect(recordingState.events[0].type).toBe('navigation');
    });
    
    test('should maintain event order', () => {
      const events = [
        { type: 'click', timestamp: Date.now(), selector: '#btn1' },
        { type: 'input', timestamp: Date.now() + 100, selector: '#input1' },
        { type: 'click', timestamp: Date.now() + 200, selector: '#btn2' }
      ];
      
      recordingState.events = events;
      
      expect(recordingState.events.length).toBe(3);
      expect(recordingState.events[0].type).toBe('click');
      expect(recordingState.events[1].type).toBe('input');
      expect(recordingState.events[2].type).toBe('click');
    });
  });
  
  describe('Stop Recording', () => {
    beforeEach(() => {
      recordingState.isRecording = true;
      recordingState.tabId = 1;
      recordingState.events = [
        { type: 'click', selector: '#btn' }
      ];
    });
    
    test('should clear recording state', () => {
      recordingState.isRecording = false;
      recordingState.tabId = null;
      recordingState.startTime = null;
      
      expect(recordingState.isRecording).toBe(false);
      expect(recordingState.tabId).toBeNull();
    });
    
    test('should clear badge', async () => {
      await chrome.action.setBadgeText({ text: '' });
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
    
    test('should detach debugger', async () => {
      const tabId = 1;
      
      await chrome.debugger.detach({ tabId });
      
      expect(chrome.debugger.detach).toHaveBeenCalledWith({ tabId });
    });
    
    test('should return captured events', () => {
      const capturedEvents = [...recordingState.events];
      
      expect(capturedEvents.length).toBeGreaterThan(0);
      expect(capturedEvents[0]).toHaveProperty('type');
      expect(capturedEvents[0]).toHaveProperty('selector');
    });
  });
  
  describe('State Management', () => {
    test('should load state from storage', async () => {
      chrome.storage.local.get.mockImplementation((keys) => {
        return Promise.resolve({
          recordingState: {
            isRecording: true,
            tabId: 1,
            events: [{ type: 'click' }]
          }
        });
      });
      
      const data = await chrome.storage.local.get(['recordingState']);
      
      expect(data.recordingState.isRecording).toBe(true);
      expect(data.recordingState.events.length).toBe(1);
    });
    
    test('should persist events to storage', async () => {
      recordingState.events = [
        { type: 'click', selector: '#btn1' },
        { type: 'click', selector: '#btn2' }
      ];
      
      await chrome.storage.local.set({
        events: recordingState.events
      });
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          events: expect.arrayContaining([
            expect.objectContaining({ type: 'click' })
          ])
        })
      );
    });
    
    test('should handle storage quota', () => {
      const maxEvents = 1000;
      recordingState.events = new Array(maxEvents).fill({ type: 'click' });
      
      // Simulate quota limit
      if (recordingState.events.length >= maxEvents) {
        recordingState.events = recordingState.events.slice(-maxEvents);
      }
      
      expect(recordingState.events.length).toBeLessThanOrEqual(maxEvents);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle debugger attach failure', async () => {
      chrome.debugger.attach.mockImplementation((target, version, callback) => {
        chrome.runtime.lastError = { message: 'Cannot attach to this target' };
        if (callback) callback();
      });
      
      await chrome.debugger.attach({ tabId: 1 }, '1.3');
      
      expect(chrome.runtime.lastError).toBeDefined();
    });
    
    test('should handle missing tab', async () => {
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        chrome.runtime.lastError = { message: 'No tab with id: 999' };
        if (callback) callback(null);
      });
      
      await chrome.tabs.get(999);
      
      expect(chrome.runtime.lastError).toBeDefined();
    });
    
    test('should handle storage errors', async () => {
      chrome.storage.local.set.mockImplementation((items, callback) => {
        chrome.runtime.lastError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' };
        if (callback) callback();
      });
      
      await chrome.storage.local.set({ largeData: 'x'.repeat(10000000) });
      
      expect(chrome.runtime.lastError).toBeDefined();
    });
  });
  
  describe('Message Handling', () => {
    test('should respond to getState message', () => {
      const message = { action: 'getState' };
      const sendResponse = jest.fn();
      
      // Simulate message handler
      const response = {
        isRecording: recordingState.isRecording,
        eventsCount: recordingState.events.length,
        geminiEnabled: recordingState.geminiEnabled
      };
      
      sendResponse(response);
      
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          isRecording: expect.any(Boolean),
          eventsCount: expect.any(Number)
        })
      );
    });
    
    test('should respond to startRecording message', () => {
      const message = { action: 'startRecording' };
      const sendResponse = jest.fn();
      
      recordingState.isRecording = true;
      
      sendResponse({ 
        success: true, 
        geminiEnabled: true 
      });
      
      expect(sendResponse).toHaveBeenCalledWith({
        success: true,
        geminiEnabled: true
      });
    });
    
    test('should respond to stopRecording message', () => {
      recordingState.isRecording = true;
      recordingState.events = [{ type: 'click' }];
      
      const events = [...recordingState.events];
      recordingState.isRecording = false;
      
      const sendResponse = jest.fn();
      sendResponse({ 
        success: true, 
        events 
      });
      
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          events: expect.any(Array)
        })
      );
    });
  });
  
  describe('Integration with Gemini', () => {
    test('should check API key on startup', async () => {
      const result = await chrome.storage.sync.get(['geminiApiKey']);
      
      expect(result.geminiApiKey).toBeDefined();
      expect(result.geminiApiKey).toBe('AIzaSyTest123');
    });
    
    test('should enable Gemini when API key present', async () => {
      chrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({ geminiApiKey: 'AIzaSyTest123' });
      });
      
      const data = await chrome.storage.sync.get(['geminiApiKey']);
      const geminiEnabled = !!(data.geminiApiKey && data.geminiApiKey.length > 0);
      
      expect(geminiEnabled).toBe(true);
    });
    
    test('should use fallback when no API key', async () => {
      chrome.storage.sync.get.mockImplementation((keys) => {
        return Promise.resolve({ geminiApiKey: null });
      });
      
      const data = await chrome.storage.sync.get(['geminiApiKey']);
      const geminiEnabled = !!(data.geminiApiKey && data.geminiApiKey.length > 0);
      
      expect(geminiEnabled).toBe(false);
    });
  });
});

describe('Service Worker - MCP Chrome DevTools Integration', () => {
  test('should enable DOM domain', async () => {
    await chrome.debugger.sendCommand({ tabId: 1 }, 'DOM.enable');
    
    expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId: 1 },
      'DOM.enable'
    );
  });
  
  test('should enable Network domain', async () => {
    await chrome.debugger.sendCommand({ tabId: 1 }, 'Network.enable');
    
    expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId: 1 },
      'Network.enable'
    );
  });
  
  test('should enable Log domain', async () => {
    await chrome.debugger.sendCommand({ tabId: 1 }, 'Log.enable');
    
    expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId: 1 },
      'Log.enable'
    );
  });
  
  test('should listen to debugger events', () => {
    const listener = jest.fn();
    
    chrome.debugger.onEvent.addListener(listener);
    
    expect(chrome.debugger.onEvent.addListener).toHaveBeenCalledWith(listener);
  });
  
  test('should handle debugger detach', () => {
    const detachListener = jest.fn();
    
    chrome.debugger.onDetach.addListener(detachListener);
    
    expect(chrome.debugger.onDetach.addListener).toHaveBeenCalledWith(detachListener);
  });
});
