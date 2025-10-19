/**
 * Jest Configuration for TestBuilder Extension
 * 
 * Test Environment: jsdom (simula navegador para chrome APIs)
 * Module Type: ESM (ES Modules)
 * Coverage Target: 80%+
 */

export default {
  // Tipo de módulos
  testEnvironment: 'jsdom',
  
  // Extensiones de archivos a procesar
  moduleFileExtensions: ['js', 'json'],
  
  // Transformación de archivos
  transform: {},
  
  // Directorio raíz de tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/n8n-workflows/',
    '/gemini-mcp-playwright-runner/',
    '/.local/'
  ],
  
  // Setup files que se ejecutan antes de cada test
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  modulePaths: ['<rootDir>'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // Configuración de timeouts
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks automáticamente entre tests
  clearMocks: true,
  
  // Restore mocks automáticamente
  restoreMocks: true,
  
  // Reset mocks automáticamente
  resetMocks: true
};
