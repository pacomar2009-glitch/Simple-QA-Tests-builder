/**
 * Chrome APIs Mock para Testing
 * 
 * Simula las APIs de Chrome Extension necesarias para los tests
 * sin necesitar un navegador real.
 */

import { jest } from '@jest/globals';

// Storage API Mock - Funciones simples sin jest.fn()
const createStorageMock = () => {
  const data = {};
  
  return {
    data, // Exposed for testing/debugging
    
    get(keys) {
      const result = {};
      
      if (keys === null || keys === undefined) {
        return Promise.resolve({ ...data });
      }
      
      if (typeof keys === 'string') {
        if (data.hasOwnProperty(keys)) {
          result[keys] = data[keys];
        }
        return Promise.resolve(result);
      }
      
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (data.hasOwnProperty(key)) {
            result[key] = data[key];
          }
        });
        return Promise.resolve(result);
      }
      
      if (typeof keys === 'object') {
        Object.keys(keys).forEach(key => {
          result[key] = data.hasOwnProperty(key) ? data[key] : keys[key];
        });
        return Promise.resolve(result);
      }
      
      return Promise.resolve(result);
    },
    
    set(items) {
      Object.assign(data, items);
      return Promise.resolve();
    },
    
    remove(keys) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => delete data[key]);
      return Promise.resolve();
    },
    
    clear() {
      Object.keys(data).forEach(key => delete data[key]);
      return Promise.resolve();
    },
    
    getBytesInUse(keys) {
      if (keys === null || keys === undefined) {
        return Promise.resolve(JSON.stringify(data).length);
      }
      if (typeof keys === 'string') {
        return Promise.resolve(JSON.stringify(data[keys] || '').length);
      }
      if (Array.isArray(keys)) {
        let totalSize = 0;
        keys.forEach(key => {
          totalSize += JSON.stringify(data[key] || '').length;
        });
        return Promise.resolve(totalSize);
      }
      return Promise.resolve(0);
    },
    
    // Helper para resetear
    __reset() {
      Object.keys(data).forEach(key => delete data[key]);
    }
  };
};

// Action API Mock (para badge)
const createActionMock = () => {
  return {
    setBadgeText: jest.fn((details) => Promise.resolve()),
    setBadgeBackgroundColor: jest.fn((details) => Promise.resolve()),
    setTitle: jest.fn((details) => Promise.resolve()),
    
    __reset() {
      this.setBadgeText.mockClear();
      this.setBadgeBackgroundColor.mockClear();
      this.setTitle.mockClear();
    }
  };
};

// Tabs API Mock
const createTabsMock = () => {
  return {
    query: jest.fn(() => Promise.resolve([])),
    get: jest.fn((tabId) => Promise.resolve({ id: tabId, url: 'https://example.com' })),
    create: jest.fn((createProperties) => Promise.resolve({ id: 1, ...createProperties })),
    remove: jest.fn((tabIds) => Promise.resolve()),
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    
    __reset() {
      this.query.mockClear();
      this.get.mockClear();
      this.create.mockClear();
      this.remove.mockClear();
      this.sendMessage.mockClear();
    }
  };
};

// Windows API Mock
const createWindowsMock = () => {
  return {
    create: jest.fn((createData) => Promise.resolve({ id: 1, ...createData })),
    remove: jest.fn((windowId) => Promise.resolve()),
    get: jest.fn((windowId) => Promise.resolve({ id: windowId })),
    getAll: jest.fn(() => Promise.resolve([])),
    
    __reset() {
      this.create.mockClear();
      this.remove.mockClear();
      this.get.mockClear();
      this.getAll.mockClear();
    }
  };
};

// Runtime API Mock
const createRuntimeMock = () => {
  return {
    id: 'test-extension-id',
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getManifest: jest.fn(() => ({
      name: 'TestBuilder',
      version: '2.0.0',
      manifest_version: 3
    })),
    
    __reset() {
      this.sendMessage.mockClear();
      this.onMessage.addListener.mockClear();
      this.onMessage.removeListener.mockClear();
    }
  };
};

// Chrome global mock
export const chromeMock = {
  storage: {
    local: createStorageMock()
  },
  action: createActionMock(),
  tabs: createTabsMock(),
  windows: createWindowsMock(),
  runtime: createRuntimeMock(),
  
  // Helper global para resetear todos los mocks
  __resetAll() {
    this.storage.local.__reset();
    this.action.__reset();
    this.tabs.__reset();
    this.windows.__reset();
    this.runtime.__reset();
  }
};

// Exportar también como global chrome
global.chrome = chromeMock;

export default chromeMock;
