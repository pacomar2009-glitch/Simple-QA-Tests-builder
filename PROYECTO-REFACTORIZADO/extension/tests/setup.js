/**
 * Jest Setup File
 * 
 * Se ejecuta antes de cada archivo de tests.
 * Configura el entorno de testing global.
 */

import { jest, beforeEach, afterEach } from '@jest/globals';
import { chromeMock } from './__mocks__/chrome.js';

// Configurar chrome mock globalmente
global.chrome = chromeMock;

// Console logging para tests (opcional, comentar si es muy verbose)
global.console = {
  ...console,
  // Silenciar logs en tests (descomentar si no quieres ver logs)
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // Mantener errores visibles
  error: console.error
};

// Setup antes de cada test
beforeEach(() => {
  // Resetear todos los mocks de chrome
  chromeMock.__resetAll();
  
  // Limpiar storage
  chromeMock.storage.local.data = {};
});

// Cleanup después de cada test
afterEach(() => {
  // Limpiar cualquier timer
  jest.clearAllTimers();
  
  // Limpiar mocks
  jest.clearAllMocks();
});

// Setup global para timeouts
jest.setTimeout(10000); // 10 segundos por test

console.log('✅ Jest setup completed');
