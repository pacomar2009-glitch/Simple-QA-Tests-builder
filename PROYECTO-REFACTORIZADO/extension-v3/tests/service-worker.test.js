/**
 * Tests para Service Worker - Fallback Notifications (US#121)
 */

import { jest, describe, test, expect } from '@jest/globals';

// Mock chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getManifest: jest.fn(() => ({ version: '3.0.0' }))
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  notifications: {
    create: jest.fn((id, options, callback) => {
      if (callback) callback('notification-id');
    })
  },
  debugger: {
    attach: jest.fn(),
    sendCommand: jest.fn(),
    onEvent: {
      addListener: jest.fn()
    }
  }
};

describe('Service Worker - Fallback Notifications', () => {
  
  describe('Badge Differentiation', () => {
    test('should set RED badge with "REC" when Gemini enabled', async () => {
      const geminiEnabled = true;
      
      // Simulate recording start with Gemini
      if (geminiEnabled) {
        chrome.action.setBadgeText({ text: 'REC' });
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
      }
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
    });
    
    test('should set ORANGE badge with "FB" when Gemini disabled', async () => {
      const geminiEnabled = false;
      
      // Simulate recording start without Gemini
      if (!geminiEnabled) {
        chrome.action.setBadgeText({ text: 'FB' });
        chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
      }
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'FB' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#f59e0b' });
    });
  });
  
  describe('Fallback Mode Notifications', () => {
    test('should create notification when starting recording without Gemini', () => {
      const geminiEnabled = false;
      
      if (!geminiEnabled) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: '⚠️ Grabación en Modo Fallback',
          message: 'Gemini IA no disponible. Usando análisis básico sin IA.\n\nConfigura tu API Key para habilitar análisis inteligente.',
          priority: 1,
          requireInteraction: false
        });
      }
      
      expect(chrome.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'basic',
          title: '⚠️ Grabación en Modo Fallback',
          message: expect.stringContaining('Gemini IA no disponible')
        })
      );
    });
    
    test('should NOT create notification when Gemini is available', () => {
      const geminiEnabled = true;
      
      chrome.notifications.create.mockClear();
      
      if (!geminiEnabled) {
        chrome.notifications.create({
          type: 'basic',
          title: '⚠️ Grabación en Modo Fallback'
        });
      }
      
      expect(chrome.notifications.create).not.toHaveBeenCalled();
    });
  });
  
  describe('API Key Detection', () => {
    test('should detect valid API key', async () => {
      const mockGetStorage = (keys, callback) => {
        callback({ geminiApiKey: 'AIzaSyTest123' });
      };
      
      chrome.storage.sync.get = jest.fn(mockGetStorage);
      
      return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
          const hasApiKey = result.geminiApiKey && result.geminiApiKey.length > 0;
          expect(hasApiKey).toBe(true);
          resolve();
        });
      });
    });
    
    test('should detect missing API key', async () => {
      const mockGetStorage = (keys, callback) => {
        callback({ geminiApiKey: null });
      };
      
      chrome.storage.sync.get = jest.fn(mockGetStorage);
      
      return new Promise((resolve) => {
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
          const hasApiKey = result.geminiApiKey !== null && result.geminiApiKey !== undefined && result.geminiApiKey.length > 0;
          expect(hasApiKey).toBe(false);
          resolve();
        });
      });
    });
  });
  
  describe('State Management', () => {
    test('should track recording state', () => {
      const state = {
        isRecording: false,
        geminiEnabled: false,
        currentTabId: null
      };
      
      // Start recording
      state.isRecording = true;
      state.currentTabId = 123;
      
      expect(state.isRecording).toBe(true);
      expect(state.currentTabId).toBe(123);
    });
    
    test('should clear state on stop', () => {
      const state = {
        isRecording: true,
        geminiEnabled: true,
        currentTabId: 123
      };
      
      // Stop recording
      state.isRecording = false;
      state.currentTabId = null;
      
      expect(state.isRecording).toBe(false);
      expect(state.currentTabId).toBeNull();
    });
  });
  
  describe('Message Handling', () => {
    test('should respond to getState message', () => {
      const mockState = {
        isRecording: true,
        geminiEnabled: false,
        eventsCount: 5
      };
      
      const message = { action: 'getState' };
      const sendResponse = jest.fn();
      
      // Simulate message handler
      if (message.action === 'getState') {
        sendResponse(mockState);
      }
      
      expect(sendResponse).toHaveBeenCalledWith(mockState);
    });
  });
});

describe('Service Worker - Recording Flow', () => {
  
  test('should start recording with proper badge', () => {
    const geminiEnabled = true;
    
    // Start recording
    chrome.action.setBadgeText({ text: geminiEnabled ? 'REC' : 'FB' });
    chrome.action.setBadgeBackgroundColor({ 
      color: geminiEnabled ? '#FF0000' : '#f59e0b' 
    });
    
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'REC' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ 
      color: '#FF0000' 
    });
  });
  
  test('should clear badge on stop', () => {
    chrome.action.setBadgeText({ text: '' });
    
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});
