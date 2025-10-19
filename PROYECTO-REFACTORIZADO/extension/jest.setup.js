// ===================================
// 🧪 CONFIGURACIÓN DE JEST
// ===================================

// Mock de chrome API global
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
      })
    }
  },
  scripting: {
    executeScript: jest.fn((details, callback) => {
      if (callback) callback([{ result: true }]);
    })
  },
  tabs: {
    query: jest.fn((query, callback) => {
      callback([{ id: 123, url: 'https://example.com' }]);
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({ success: true });
    })
  },
  webNavigation: {
    onCompleted: {
      addListener: jest.fn()
    }
  }
};

// Mock de console para tests silenciosos
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Reset mocks entre tests
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset chrome.runtime.lastError
  chrome.runtime.lastError = null;
  
  // Reset console logs
  console.log.mockClear();
  console.debug.mockClear();
  console.info.mockClear();
  console.warn.mockClear();
  console.error.mockClear();
});
